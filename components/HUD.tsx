
import React, { useState, useEffect } from 'react';
import { Lineage, type UserProfile } from '../types';
import { ShieldCheck, RotateCw, Battery, BatteryMedium, MessageSquare, Terminal, Sparkles, WifiOff } from 'lucide-react';

interface HUDProps {
  lineage: Lineage;
  onToggleLineage: () => void;
  onOpenOracle?: () => void;
  profile: UserProfile;
  isOffline?: boolean;
}

const HUD: React.FC<HUDProps> = ({ lineage, onToggleLineage, profile, onOpenOracle, isOffline }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour12: false });
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  };

  const isWizard = lineage === Lineage.WIZARD;

  return (
    <div className={`
      flex items-center justify-between px-6 py-3 border-b backdrop-blur-md sticky top-0 z-30 transition-colors duration-1000
      ${isWizard 
        ? 'bg-black/60 border-emerald-900/30 text-emerald-400 font-wizard' 
        : 'bg-black/60 border-fuchsia-900/30 text-fuchsia-400 font-muggle'}
    `}>
      {/* Left Status */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2" title={isWizard ? "Protective Wards Active" : "Encryption: 256-bit"}>
          {isOffline ? (
             <div className="flex items-center gap-1 text-red-500 animate-pulse">
                <WifiOff size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{isWizard ? 'Connection Severed' : 'OFFLINE'}</span>
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
        >
            {isWizard ? <Sparkles size={14} /> : <Terminal size={14} />}
            <span className="text-xs font-bold">{isWizard ? "Ask Oracle" : "Sys_Cmd"}</span>
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

      {/* Right Time */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-bold">{formatTime(time)}</div>
          <div className="text-[10px] opacity-60">timestamp::{formatDate(time)}</div>
        </div>
        {isWizard ? <BatteryMedium size={18} className="opacity-80" /> : <Battery size={18} className="opacity-80" />}
      </div>
    </div>
  );
};

export default HUD;
