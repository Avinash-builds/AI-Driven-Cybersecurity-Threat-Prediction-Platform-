import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecurityStats {
  totalThreats: number;
  blockedAttacks: number;
  activeIncidents: number;
  liveAttacksCount: number;
  criticalThreats: number;
  highThreats: number;
}

export function useSecurityStats() {
  const [stats, setStats] = useState<SecurityStats>({
    totalThreats: 0,
    blockedAttacks: 0,
    activeIncidents: 0,
    liveAttacksCount: 0,
    criticalThreats: 0,
    highThreats: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [
        { count: liveCount },
        { count: blockedCount },
        { count: incidentCount },
        { count: criticalCount },
        { count: highCount },
      ] = await Promise.all([
        supabase.from('live_attacks').select('*', { count: 'exact', head: true }),
        supabase.from('blocked_attacks').select('*', { count: 'exact', head: true }),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['open', 'investigating']),
        supabase.from('live_attacks').select('*', { count: 'exact', head: true }).eq('severity', 'critical'),
        supabase.from('live_attacks').select('*', { count: 'exact', head: true }).eq('severity', 'high'),
      ]);

      setStats({
        totalThreats: (liveCount || 0) + (blockedCount || 0),
        blockedAttacks: blockedCount || 0,
        activeIncidents: incidentCount || 0,
        liveAttacksCount: liveCount || 0,
        criticalThreats: criticalCount || 0,
        highThreats: highCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const blockAttack = async (attackId: string, sourceIp: string, attackType: string, severity: string, reason: string) => {
    try {
      const { error } = await supabase.functions.invoke('block-entity', {
        body: { type: 'ip', value: sourceIp, attack_id: attackId, attack_type: attackType, severity, reason }
      });
      if (error) throw error;
      toast.success(`Blocked IP: ${sourceIp}`);
      await fetchStats();
      return true;
    } catch (error: any) {
      toast.error(`Failed to block: ${error.message}`);
      return false;
    }
  };

  useEffect(() => {
    fetchStats();
    const channel = supabase.channel('stats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_attacks' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_attacks' }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStats]);

  return { stats, isLoading, refresh: fetchStats, blockAttack };
}
