import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, // 'ip' | 'domain' | 'api_key'
      value,
      reason,
      attack_id,
      attack_type,
      severity,
      auto_blocked = false
    } = await req.json();
    
    if (!type || !value) {
      return new Response(
        JSON.stringify({ error: 'Type and value are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['ip', 'domain', 'api_key'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Use: ip, domain, or api_key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if already blocked
    const { data: existing } = await supabase
      .from('blocked_entities')
      .select('*')
      .eq('type', type)
      .eq('value', value)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: `${type} is already blocked`,
          blocked_at: existing.blocked_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add to blocked_entities
    const { data: blockedEntity, error: blockError } = await supabase
      .from('blocked_entities')
      .insert({
        type,
        value,
        reason: reason || `Blocked via API - ${attack_type || 'Manual block'}`
      })
      .select()
      .single();

    if (blockError) {
      throw blockError;
    }

    // If blocking an IP with attack details, also add to blocked_attacks for UI
    if (type === 'ip') {
      await supabase.from('blocked_attacks').insert({
        attack_id,
        source_ip: value,
        attack_type: attack_type || 'Unknown',
        severity: severity || 'medium',
        auto_blocked,
        reason: reason || `Manually blocked`
      });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      action: 'entity_blocked',
      resource_type: 'blocked_entities',
      resource_id: blockedEntity.id,
      details: { 
        type,
        value,
        reason,
        attack_type,
        severity,
        auto_blocked
      }
    });

    // Log to realtime_logs
    await supabase.from('realtime_logs').insert({
      raw_log: {
        event: 'entity_blocked',
        type,
        value,
        reason,
        timestamp: new Date().toISOString()
      },
      log_type: 'security',
      source: 'block-entity'
    });

    console.log(`Blocked ${type}: ${value}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${type} blocked successfully`,
        blocked_entity: blockedEntity
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Block entity error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
