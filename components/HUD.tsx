
import React, { useState, useEffect } from 'react';
import { Lineage, type UserProfile } from '../types';
import { ShieldCheck, RotateCw, Battery, BatteryMedium, BatteryFull, BatteryLow, MessageSquare, Terminal, Sparkles, WifiOff, Zap } from 'lucide-react';

interface HUDProps {
  lineage: Lineage;
  onToggleLineage: () => void;
  onOpenOracle?: () => void;
  profile: UserProfile;
  isOffline?: boolean;
}

// Battery API Types (non-standard)
interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
}

const HUD: React.FC<HUDProps> = ({ lineage, onToggleLineage, profile, onOpenOracle, isOffline }) => {
  const [time, setTime] = useState(new Date());
  const [battery, setBattery] = useState<{level: number, charging: boolean} | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Battery API Logic
  useEffect(() => {
    let batteryManager: BatteryManager | null = null;

    const updateBattery = () => {
      if (batteryManager) {
        setBattery({
          level: batteryManager.level,
          charging: batteryManager.charging
        });
      }
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bm: BatteryManager) => {
        batteryManager = bm;
        updateBattery();
        bm.addEventListener('levelchange', updateBattery);
        bm.addEventListener('chargingchange', updateBattery);
      });
    }

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', updateBattery);
        batteryManager.removeEventListener('chargingchange', updateBattery);
      }
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  };

  const isWizard = lineage === Lineage.WIZARD;

  // Battery Icon Logic
  const getBatteryIcon = () => {
    if (!battery) return <BatteryMedium size={18} className="opacity-50" />;
    if (battery.charging) return <Zap size={18} className="text-yellow-400 animate-pulse" />;
    if (battery.level > 0.8) return <BatteryFull size={18} />;
    if (battery.level < 0.2) return <BatteryLow size={18} className="text-red-500 animate-pulse" />;
    return <BatteryMedium size={18} />;
  };

  return (
    <div className={`
      flex items-center justify-between px-4 sm:px-6 py-3 border-b backdrop-blur-md sticky top-0 z-30 transition-colors duration-1000 shrink-0 select-none
      ${isWizard 
        ? 'bg-black/60 border-emerald-900/30 text-emerald-400 font-wizard' 
        : 'bg-black/60 border-fuchsia-900/30 text-fuchsia-400 font-muggle'}
    `}
    style={profile.themeColor ? { borderColor: `${profile.themeColor}40`, color: profile.themeColor } : {}}
    >
      {/* Left Status */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2" title={isWizard ? "Protective Wards Active" : "Encryption: 256-bit"}>
          {isOffline ? (
             <div className="flex items-center gap-1 text-red-500 animate-pulse">
                <WifiOff size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">{isWizard ? 'Connection Severed' : 'OFFLINE'}</span>
             </div>
          ) : (
             <>
               <ShieldCheck size={16} className={isWizard ? "animate-pulse" : ""} />
               <span className="text-xs uppercase tracking-wider hidden md:block">
                 {isWizard ? "Wards: Secure" : "SEC: ENCRYPTED"}
               </span>
             </>
          )}
        </div>
        
        {/* Chat Trigger */}
        <button 
          onClick={onOpenOracle}
          className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all hover:scale-105 active:scale-95
             ${isWizard ? 'bg-emerald-900/20 border-emerald-500/40 hover:bg-emerald-900/40' : 'bg-fuchsia-900/20 border-fuchsia-500/40 hover:bg-fuchsia-900/40'}
          `}
          style={profile.themeColor ? { borderColor: `${profile.themeColor}60`, backgroundColor: `${profile.themeColor}20` } : {}}
        >
            {isWizard ? <Sparkles size={14} /> : <Terminal size={14} />}
            <span className="text-xs font-bold whitespace-nowrap">{isWizard ? "Ask Oracle" : "Sys_Cmd"}</span>
        </button>
      </div>

      {/* Center: Reality Switcher */}
      <div className="flex items-center">
        <button
          onClick={onToggleLineage}
          className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300 hover:scale-105
            ${isWizard 
              ? 'bg-emerald-900/30 border-emerald-500/50 hover:bg-emerald-800/40 text-emerald-200' 
              : 'bg-fuchsia-900/30 border-fuchsia-500/50 hover:bg-fuchsia-800/40 text-fuchsia-200'}
          `}
          title="Shift Reality"
        >
          <RotateCw size={14} className={isWizard ? 'animate-spin-slow' : ''} />
          <span className="text-[10px] font-bold tracking-widest uppercase hidden sm:block">
            {isWizard ? "Muggle View" : "Wizard View"}
          </span>
        </button>
      </div>

      {/* Right Time & Info */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block leading-tight">
          <div className="text-xs font-bold flex items-center justify-end gap-1 max-w-[100px] truncate">
             {profile.displayName || 'Guest'}
          </div>
          <div className="text-[10px] opacity-60 font-mono">{formatDate(time)} {formatTime(time)}</div>
        </div>
        
        {/* Battery Widget */}
        <div className="flex items-center gap-1 opacity-80" title={battery ? `Battery: ${Math.round(battery.level * 100)}%` : "Checking Power..."}>
            <span className="text-[10px] font-bold hidden sm:inline">{battery ? `${Math.round(battery.level * 100)}%` : ''}</span>
            {getBatteryIcon()}
        </div>
      </div>
    </div>
  );
};

export default HUD;
