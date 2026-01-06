import { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Globe as GlobeIcon, Map as MapIcon, Shield, Zap } from 'lucide-react';

interface Attack {
  id: string;
  source_lat: number;
  source_lng: number;
  target_lat: number;
  target_lng: number;
  severity: string;
  attack_type: string;
  source_ip?: string;
  source_country?: string;
}

interface AttackGlobeProps {
  attacks: Attack[];
  stats?: {
    total: number;
    attacksPerMinute: number;
  };
}

export function AttackGlobe({ attacks, stats }: AttackGlobeProps) {
  const globeEl = useRef<any>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'intel'>('map');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Transform attacks to globe format
  const arcsData = useMemo(() => {
    return attacks.slice(0, 25).map(attack => ({
      startLat: attack.source_lat || 0,
      startLng: attack.source_lng || 0,
      endLat: attack.target_lat || 0,
      endLng: attack.target_lng || 0,
      color: attack.severity === 'critical' ? '#ff003c' :
             attack.severity === 'high' ? '#fdf500' :
             attack.severity === 'medium' ? '#00f2ff' : '#22c55e',
      type: attack.attack_type,
      ip: attack.source_ip || 'Unknown'
    }));
  }, [attacks]);

  const pointsData = useMemo(() => {
    return attacks.slice(0, 25).map(attack => ({
      lat: attack.target_lat || 0,
      lng: attack.target_lng || 0,
      color: attack.severity === 'critical' ? '#ff003c' :
             attack.severity === 'high' ? '#fdf500' :
             attack.severity === 'medium' ? '#00f2ff' : '#22c55e'
    }));
  }, [attacks]);

  const displayStats = {
    total: stats?.total || attacks.length,
    rate: stats?.attacksPerMinute || Math.floor(Math.random() * 20) + 30
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#050510] overflow-hidden select-none flex items-center justify-center rounded-lg">
      {/* Mobile Tab Toggle */}
      <div className="absolute top-4 right-4 z-50 flex lg:hidden bg-black/40 p-1 rounded-xl border border-white/10 backdrop-blur-md">
        <button 
          onClick={() => setActiveTab('map')}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'map' 
              ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Map
        </button>
        <button 
          onClick={() => setActiveTab('intel')}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'intel' 
              ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(188,0,255,0.3)]' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Intel
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!isMapMode ? (
          <motion.div
            key="globe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-10 transition-opacity duration-300 ${activeTab === 'intel' ? 'opacity-20 pointer-events-none lg:opacity-100 lg:pointer-events-auto' : 'opacity-100'}`}
          >
            <Globe
              ref={globeEl}
              width={dimensions.width}
              height={dimensions.height}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
              arcsData={arcsData}
              arcColor={'color'}
              arcDashLength={0.4}
              arcDashGap={4}
              arcDashAnimateTime={1000}
              arcStroke={0.5}
              pointsData={pointsData}
              pointColor="color"
              pointRadius={0.5}
              pointAltitude={0}
            />
          </motion.div>
        ) : (
          <motion.div
            key="flatmap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-10 bg-[#050505] flex items-center justify-center p-4 md:p-10 transition-opacity duration-300 ${activeTab === 'intel' ? 'opacity-20 pointer-events-none lg:opacity-100 lg:pointer-events-auto' : 'opacity-100'}`}
          >
            <div className="relative w-full h-full border border-white/10 rounded-3xl overflow-hidden bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-contain bg-no-repeat bg-center opacity-50 grayscale hover:grayscale-0 transition-all duration-1000">
              {arcsData.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [1, 2, 3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
                  style={{
                    left: `${(a.endLng + 180) / 3.6}%`,
                    top: `${(-a.endLat + 90) / 1.8}%`,
                    backgroundColor: a.color
                  }}
                  className="absolute w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]"
                />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <h2 className="text-2xl md:text-4xl font-bold text-white opacity-10 uppercase tracking-[0.5em] md:tracking-[1em] text-center">Flat Projection</h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 space-y-3 pointer-events-none md:pointer-events-auto w-auto max-w-[calc(100%-5rem)] md:max-w-none">
        <div className="backdrop-blur-md bg-black/40 p-4 rounded-2xl border-l-4 border-primary w-56 pointer-events-auto shadow-lg">
          <div className="text-xs text-primary font-mono mb-1 tracking-widest uppercase">Global Attack Rate</div>
          <div className="text-xl md:text-2xl font-bold text-white font-mono">
            {displayStats.rate} <span className="text-[10px] md:text-xs font-normal text-gray-500 uppercase tracking-tighter">Attacks/Sec</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1 bg-white bg-opacity-5 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${(displayStats.rate / 60) * 100}%` }}
                className="h-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
              />
            </div>
          </div>
        </div>

        <div className={`backdrop-blur-md bg-black/40 p-3 rounded-2xl w-56 space-y-2 pointer-events-auto ${activeTab === 'intel' ? 'block' : 'hidden md:block'}`}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Crosshair size={12} className="text-destructive" />
            Live Vectors
          </h3>
          <div className="space-y-1.5 max-h-28 overflow-y-auto scrollbar-hide">
            {arcsData.slice().reverse().slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] font-mono p-2 bg-black/40 border border-white/5 rounded">
                <span className="text-destructive truncate max-w-[80px]">{a.ip}</span>
                <span className="text-white opacity-50">→</span>
                <span className="text-primary truncate max-w-[60px]">{a.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={`absolute bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-20 backdrop-blur-md bg-black/40 p-3 md:px-6 md:py-3 rounded-2xl md:rounded-full flex flex-row flex-wrap md:flex-nowrap items-center justify-between md:justify-center gap-3 md:gap-6 border border-white/10 pointer-events-auto transition-opacity ${activeTab === 'intel' ? 'opacity-0 pointer-events-none lg:opacity-100' : 'opacity-100'}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]"></div>
          <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-warning shadow-[0_0_8px_hsl(var(--warning))]"></div>
          <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"></div>
          <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))]"></div>
          <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">Low</span>
        </div>
      </div>

      {/* View Toggle */}
      <div className={`absolute bottom-16 right-4 md:bottom-4 md:right-4 z-20 flex flex-col gap-2 pointer-events-auto transition-opacity ${activeTab === 'intel' ? 'opacity-0 pointer-events-none lg:opacity-100' : 'opacity-100'}`}>
        <button
          onClick={() => setIsMapMode(false)}
          className={`p-2.5 rounded-xl transition-all ${!isMapMode ? 'bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)]' : 'backdrop-blur-md bg-black/40 text-white hover:bg-white/10 border border-white/10'}`}
        >
          <GlobeIcon size={18} />
        </button>
        <button
          onClick={() => setIsMapMode(true)}
          className={`p-2.5 rounded-xl transition-all ${isMapMode ? 'bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)]' : 'backdrop-blur-md bg-black/40 text-white hover:bg-white/10 border border-white/10'}`}
        >
          <MapIcon size={18} />
        </button>
      </div>

      {/* Threat Intel Panel (Desktop) */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20 backdrop-blur-md bg-black/40 p-4 rounded-2xl w-56 hidden lg:block pointer-events-auto border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Threat Intel</h3>
          <Shield size={16} className="text-success" />
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-black/50 border border-destructive/50">
            <div className="text-[10px] font-bold text-destructive uppercase mb-1">Active Outbreak</div>
            <div className="text-xs text-white font-medium mb-1">LockBit 3.0 Variant</div>
            <div className="text-[10px] text-gray-400 font-medium">SEA region affected</div>
          </div>
          <div className="p-3 rounded-xl bg-black/50 border border-white/10">
            <div className="text-[10px] font-bold text-warning uppercase mb-1">Botnet Activity</div>
            <div className="text-xs text-white font-medium mb-1">Mirai cluster surge</div>
            <div className="text-[10px] text-gray-400 font-medium">South America</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white border-opacity-10">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-mono">Total Blocked</div>
              <div className="text-lg font-bold text-white font-mono">{displayStats.total.toLocaleString()}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-success/10 text-success">
              <Zap size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
