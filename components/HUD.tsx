

import React, { useState, useEffect } from 'react';
import { Lineage, type UserProfile, GlobalConfig } from '../types';
import { ShieldCheck, RotateCw, BatteryMedium, BatteryFull, BatteryLow, Terminal, Sparkles, WifiOff, Zap, User, Accessibility, Send, Edit2, HelpCircle, Bookmark, Download } from 'lucide-react';

interface HUDProps {
  lineage: Lineage;
  onToggleLineage: () => void;
  onOpenOracle?: () => void;
  onOpenTools?: () => void;
  profile: UserProfile;
  isOffline?: boolean;
  config?: GlobalConfig;
  onEditConfig?: () => void; // Shortcut to open config
  onNavigate?: (sectorId: string) => void;
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

const HUD: React.FC<HUDProps> = ({ lineage, onToggleLineage, profile, onOpenOracle, onOpenTools, isOffline, config, onEditConfig, onNavigate }) => {
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
  // Add this inside the HUD function:
  const [isActionDone, setIsActionDone] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsActionDone(!!localStorage.getItem('cc_action_done'));

    // Listen for updates from the popup
    const handleStorage = () => setIsActionDone(!!localStorage.getItem('cc_action_done'));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
             ${isWizard ? 'bg-emerald-900/20 border-emerald-500/40 hover:bg-emerald-900/40' : 'bg-fuchsia-900/20 border-fuchsia-900/40 hover:bg-fuchsia-900/40'}
          `}
          style={profile.themeColor ? { borderColor: `${profile.themeColor}60`, backgroundColor: `${profile.themeColor}20` } : {}}
          title={isWizard ? "Consult the Oracle (AI Chat)" : "Access Command Interface (AI Chat)"}
        >
            {isWizard ? <Sparkles size={14} /> : <Terminal size={14} />}
            <span className="text-xs font-bold whitespace-nowrap">{isWizard ? "Ask Oracle" : "Sys_Cmd"}</span>
        </button>

        {/* HELP / SYSTEM INFO TRIGGER - GLOWING */}
        <button
          onClick={() => onNavigate && onNavigate('system_info')}
          className={`relative flex items-center justify-center p-1.5 rounded-full border transition-all hover:scale-110 active:scale-95 group
            ${isWizard ? 'border-yellow-500/50 bg-yellow-900/20 text-yellow-300' : 'border-cyan-500/50 bg-cyan-900/20 text-cyan-300'}
          `}
          title="System Protocols / Help"
        >
          {/* Intense constant glow effect */}
          <div className={`absolute inset-0 rounded-full blur-[8px] opacity-60 animate-pulse 
             ${isWizard ? 'bg-yellow-500' : 'bg-cyan-500'}
          `}></div>
          <HelpCircle size={16} className="relative z-10" />
        </button>

      </div>

      {/* Center: Reality Switcher (Hidden on Mobile) */}
      <div className="flex items-center hidden sm:flex">
        <button
          onClick={onToggleLineage}
          className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300 hover:scale-105
            ${isWizard 
              ? 'bg-emerald-900/30 border-emerald-500/50 hover:bg-emerald-800/40 text-emerald-200' 
              : 'bg-fuchsia-900/30 border-fuchsia-500/50 hover:bg-fuchsia-800/40 text-fuchsia-200'}
          `}
          title="Switch between Wizard and Muggle Reality"
        >
          <RotateCw size={14} className={isWizard ? 'animate-spin-slow' : ''} />
          <span className="text-[10px] font-bold tracking-widest uppercase hidden sm:block">
            {isWizard ? "Muggle View" : "Wizard View"}
          </span>
        </button>
      </div>

      {/* Right: User Actions & Info */}
      <div className="flex items-center gap-3 sm:gap-4">

        {/* NEW: BOOKMARK / INSTALL PROMOTION BUTTON */}
        {/* 🔖 LIVE BOOKMARK / INSTALL BUTTON */}
        {/* 🟢 UPDATED: PROMOTION BUTTON (Live Icons) */}
        <button 
            onClick={() => {
                const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (mobile) {
                    alert("📲 Open Menu > 'Add to Home Screen' to install!");
                } else {
                    const isMac = /Mac/.test(navigator.platform);
                    alert(`🔖 Press ${isMac ? 'Command + D' : 'Ctrl + D'} to bookmark!`);
                }
                localStorage.setItem('cc_action_done', 'true');
                setIsActionDone(true); // Stop blinking immediately
            }}
            className={`p-2 rounded-full border transition-all hover:scale-110 active:scale-95 flex items-center justify-center relative group
                ${isWizard ? 'bg-emerald-900/50 border-emerald-500/30' : 'bg-fuchsia-900/50 border-fuchsia-500/30'}
            `}
            title={/iPhone|Android/i.test(navigator.userAgent) ? "Install App" : "Bookmark"}
        >
            {isActionDone ? (
                <Sparkles size={16} className="text-yellow-400 animate-pulse" />
            ) : (
                <>
                    {/* ICON LOGIC: Mobile gets Static Install, Desktop gets Animated Bookmark */}
                    {/iPhone|Android/i.test(navigator.userAgent) ? (
                        <img 
                            src="https://img.icons8.com/?size=100&id=101121&format=png&color=000000" 
                            className="w-5 h-5 object-contain invert opacity-90" 
                            alt="Install App"
                        />
                    ) : (
                        <img 
                            src="https://img.icons8.com/?size=100&id=B7hNQrX3PbdD&format=png&color=000000" 
                            className="w-6 h-6 object-contain invert opacity-90" 
                            alt="Bookmark Animated"
                        />
                    )}

                    {/* 🔴 ALWAYS BLINKING DOT (Until Action Taken) */}
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWizard ? 'bg-emerald-400' : 'bg-fuchsia-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></span>
                    </span>
                </>
            )}
        </button>
        
        {/* Telegram - Always visible if link exists OR if we want to edit it */}
        <button 
            onClick={() => {
                if (config?.telegramLink) {
                    window.open(config.telegramLink, '_blank');
                } else if (onEditConfig) {
                    onEditConfig(); // Prompt to add link
                }
            }}
            className={`p-2 rounded-full border transition-all hover:scale-110 active:scale-95 flex items-center justify-center relative group
                ${isWizard ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400' : 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-400'}
            `}
            title={config?.telegramLink ? "Join Official Telegram Channel" : "Configure Telegram Link (Admin Only)"}
        >
            <Send size={16} />
            {/* Always Blink Pulse for Visibility */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
        </button>

        {/* Battery & Time (Visible on mobile now) */}
        <div className="text-right leading-tight opacity-70" title="System Status">
          <div className="text-[10px] font-bold flex items-center justify-end gap-1">
             {getBatteryIcon()} {battery ? `${Math.round(battery.level * 100)}%` : ''}
          </div>
          <div className="text-[10px] font-mono hidden sm:block">{formatDate(time)} {formatTime(time)}</div>
        </div>

        <div className="h-6 w-px bg-white/10 hidden md:block"></div>

        {/* User Profile Action */}
        <div className="flex items-center gap-2">
            <button 
                onClick={onOpenTools}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 overflow-hidden
                    ${isWizard ? 'bg-emerald-900/50 border-emerald-500' : 'bg-fuchsia-900/50 border-fuchsia-500'}
                `}
                title="User Profile & Settings"
            >
                <User size={16} />
            </button>
        </div>

      </div>
    </div>
  );
};

export default HUD;