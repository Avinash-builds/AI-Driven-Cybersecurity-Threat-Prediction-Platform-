import { useState, useEffect, Suspense } from 'react';
import { Play, Pause, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AttackGlobe } from '@/components/AttackGlobe';

interface LiveAttack {
  id: string;
  type: string;
  severity: string;
  source: { ip: string; country: string; lat: number; lng: number; };
  target: { ip: string; country: string; lat: number; lng: number; };
  timestamp: string;
  confidence: number;
}

interface ThreatStreamData {
  globalThreatLevel: string;
  realtimeAttacks: LiveAttack[];
  threatActors: any[];
  geographicDistribution: any[];
  summary: string;
}

function GlobeLoader() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading 3D Globe...</p>
      </div>
    </div>
  );
}

export default function GlobeView() {
  const [attacks, setAttacks] = useState<LiveAttack[]>([]);
  const [threatData, setThreatData] = useState<ThreatStreamData | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveThreatStream = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('live-threat-stream', {
        body: { region: 'global' }
      });

      if (error) throw error;

      setThreatData(data);
      setAttacks(prev => {
        const newAttacks = data.realtimeAttacks || [];
        const combined = [...newAttacks, ...prev].slice(0, 30);
        return combined;
      });
      setIsLoading(false);
    } catch (error: any) {
      console.error('Live threat stream error:', error);
      toast.error('Failed to fetch live threat data');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveThreatStream();
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(fetchLiveThreatStream, 12000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-white';
      case 'high': return 'bg-warning text-black';
      case 'medium': return 'bg-chart-4 text-black';
      case 'low': return 'bg-success text-white';
      default: return 'bg-muted';
    }
  };

  // Transform attacks for AttackGlobe component
  const globeAttacks = attacks.map(attack => ({
    id: attack.id,
    source_lat: attack.source.lat,
    source_lng: attack.source.lng,
    target_lat: attack.target.lat,
    target_lng: attack.target.lng,
    severity: attack.severity,
    attack_type: attack.type,
    source_ip: attack.source.ip,
    source_country: attack.source.country
  }));

  const stats = {
    total: attacks.length,
    attacksPerMinute: Math.floor(Math.random() * 20) + 30
  };

  const topAttackers = threatData?.geographicDistribution?.slice(0, 5) || [];
  const threatActors = threatData?.threatActors?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">3D Globe View</h1>
          <p className="text-muted-foreground">AI-powered interactive global network visualization</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchLiveThreatStream} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 cyber-card rounded-xl border border-border h-[600px] overflow-hidden relative">
          <Suspense fallback={<GlobeLoader />}>
            <AttackGlobe attacks={globeAttacks} stats={stats} />
          </Suspense>
        </div>

        <div className="space-y-4 max-h-[600px] flex flex-col">
          <div className="cyber-card rounded-xl border border-border p-4 flex-shrink-0">
            <h3 className="font-semibold mb-3">Top Attack Sources</h3>
            <div className="space-y-2">
              {topAttackers.length > 0 ? topAttackers.map((attacker: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-sm">{attacker.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive rounded-full" style={{ width: `${Math.min(100, (attacker.attackCount / 10) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{attacker.attackCount}</span>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">Loading threat data...</p>
              )}
            </div>
          </div>

          <div className="cyber-card rounded-xl border border-border p-4 flex-shrink-0">
            <h3 className="font-semibold mb-3">Active Threat Actors</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {threatActors.length > 0 ? threatActors.map((actor: any, i: number) => (
                <div key={i} className="p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{actor.name}</span>
                    <Badge variant="outline" className={cn("text-xs flex-shrink-0",
                      actor.activityLevel === 'high' ? 'border-destructive text-destructive' :
                      actor.activityLevel === 'medium' ? 'border-warning text-warning' : 'border-success text-success'
                    )}>{actor.activityLevel}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{actor.type}</p>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">Loading actor data...</p>
              )}
            </div>
          </div>

          <div className="cyber-card rounded-xl border border-border flex flex-col flex-1 min-h-0">
            <div className="p-3 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-sm">Live Feed</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {attacks.slice(0, 10).map((attack) => (
                  <div key={attack.id} className="p-2 rounded-lg bg-muted/30 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn('text-[10px] px-1.5 py-0', getSeverityColor(attack.severity))}>
                        {attack.severity}
                      </Badge>
                      <span className="font-medium truncate">{attack.type}</span>
                    </div>
                    <p className="text-muted-foreground truncate">
                      {attack.source.country} → {attack.target.country}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {threatData?.summary && (
        <div className="cyber-card rounded-xl border border-border p-4">
          <h3 className="font-semibold mb-2">AI Intelligence Summary</h3>
          <p className="text-sm text-muted-foreground">{threatData.summary}</p>
        </div>
      )}
    </div>
  );
}
