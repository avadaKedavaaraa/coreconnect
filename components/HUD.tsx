import React, { useState, useEffect } from 'react';
import { Lineage, type UserProfile, GlobalConfig } from '../types';
import { 
  ShieldCheck, RotateCw, BatteryMedium, BatteryFull, BatteryLow, 
  Terminal, Sparkles, WifiOff, Zap, User, Send, HelpCircle 
} from 'lucide-react';

interface HUDProps {
  lineage: Lineage;
  onToggleLineage: () => void;
  onOpenOracle?: () => void;
  onOpenTools?: () => void;
  profile: UserProfile;
  isOffline?: boolean;
  config?: GlobalConfig;
  onEditConfig?: () => void;
  onNavigate?: (sectorId: string) => void;
}

// Battery API Types (non-standard)
interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void;
}

const HUD: React.FC<HUDProps> = ({ 
  lineage, onToggleLineage, profile, onOpenOracle, 
  onOpenTools, isOffline, config, onEditConfig, onNavigate 
}) => {
  
  // --- STATE MANAGEMENT ---
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isActionDone, setIsActionDone] = useState(false);
  const [time, setTime] = useState(new Date());
  const [battery, setBattery] = useState<{level: number, charging: boolean} | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // --- CORE SYSTEM LOGIC (Unified Effects) ---
  useEffect(() => {
    // A. Initialize Clock Timer
    const timer = setInterval(() => setTime(new Date()), 1000);

    // B. Detect Device Type
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    // C. PWA Install Event Listener (Only useful if we want official prompt on Android)
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // D. Storage Sync Listener (Updates HUD instantly when the Popup marks action as "Done")
    const handleStorageChange = () => {
      setIsActionDone(!!localStorage.getItem('cc_action_done'));
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('storage', handleStorageChange);
    
    // Initial check for existing "Done" status
    setIsActionDone(!!localStorage.getItem('cc_action_done'));

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Battery API Implementation
  useEffect(() => {
    let batteryManager: BatteryManager | null = null;
    const updateBattery = () => {
      if (batteryManager) {
        setBattery({ level: batteryManager.level, charging: batteryManager.charging });
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

  // --- FORMATTING HELPERS ---
  const formatTime = (date: Date) => date.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${date.getFullYear().toString().slice(-2)}`;
  };

  const isWizard = lineage === Lineage.WIZARD;

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
      {/* --- LEFT SECTOR: STATUS & CORE CMDs --- */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2" title={isWizard ? "Protective Wards Active: Shielding your magical timeline" : "Encryption: 256-bit Secure Layer Active"}>
          {isOffline ? (
             <div className="flex items-center gap-1 text-red-500 animate-pulse">
                <WifiOff size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">OFFLINE</span>
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
        
        <button onClick={onOpenOracle} className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all hover:scale-105 active:scale-95 ${isWizard ? 'bg-emerald-900/20 border-emerald-500/40' : 'bg-fuchsia-900/20 border-fuchsia-900/40'}`} title={isWizard ? "Consult the Oracle: Speak with the AI for arcane knowledge" : "Access Command Interface: Execute System AI Queries"}>
            {isWizard ? <Sparkles size={14} /> : <Terminal size={14} />}
            <span className="text-xs font-bold whitespace-nowrap">{isWizard ? "Ask Oracle" : "Sys_Cmd"}</span>
        </button>

        <button onClick={() => onNavigate && onNavigate('system_info')} className="relative flex items-center justify-center p-1.5 rounded-full border border-cyan-500/50 bg-cyan-900/20 text-cyan-300" title="System Protocols: View Help, Shortcuts and Core Documentation">
          <div className="absolute inset-0 rounded-full blur-[8px] opacity-60 animate-pulse bg-cyan-500"></div>
          <HelpCircle size={16} className="relative z-10" />
        </button>
      </div>

      {/* --- CENTER SECTOR: REALITY SWITCHER --- */}
      <div className="flex items-center hidden sm:flex">
        <button onClick={onToggleLineage} className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300 hover:scale-105 ${isWizard ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-200' : 'bg-fuchsia-900/30 border-fuchsia-500/50 text-fuchsia-200'}`} title="Reality Shift: Toggle between Wizard and Muggle consciousness">
          <RotateCw size={14} className={isWizard ? 'animate-spin-slow' : ''} />
          <span className="text-[10px] font-bold tracking-widest uppercase hidden sm:block">{isWizard ? "Muggle View" : "Wizard View"}</span>
        </button>
      </div>

      {/* --- RIGHT SECTOR: ACTIONS & USER INFO --- */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        {/* 🔖 SMART PROMOTION BUTTON (STRICT PC = BOOKMARK ONLY) */}
        <button 
            onClick={async () => {
                // CASE 1: Mobile Browser manual installation
                if (isMobile) {
                    // Try native prompt first on mobile
                    if (installPrompt) {
                        installPrompt.prompt();
                        const { outcome } = await installPrompt.userChoice;
                        if (outcome === 'accepted') setInstallPrompt(null);
                    } else {
                        alert("📲 To Install App:\n\n1. Tap Menu (⋮ or Share)\n2. Select 'Add to Home Screen'");
                    }
                } 
                // CASE 2: PC/Desktop -> Always Bookmark
                else {
                    const isMac = /Mac/.test(navigator.platform);
                    alert(`🔖 Press ${isMac ? 'Command + D' : 'Ctrl + D'} to bookmark!`);
                }
                localStorage.setItem('cc_action_done', 'true');
                setIsActionDone(true);
            }}
            className={`p-2 rounded-full border transition-all hover:scale-110 active:scale-95 flex items-center justify-center relative group
                ${isWizard ? 'bg-emerald-900/50 border-emerald-500/30' : 'bg-fuchsia-900/50 border-fuchsia-500/30'}`}
            title={isMobile ? "Install CoreConnect Neural Interface" : "Anchor this Archive to your browser bookmarks"}
        >
            <>
                {/* Icons: Show Install on Mobile, Bookmark on PC */}
                {isMobile ? (
                    <img src="https://img.icons8.com/?size=100&id=101121&format=png&color=000000" className="w-5 h-5 object-contain invert opacity-90" alt="Install" />
                ) : (
                    <img src="https://img.icons8.com/?size=100&id=B7hNQrX3PbdD&format=png&color=000000" className="w-6 h-6 object-contain invert opacity-90" alt="Bookmark" />
                )}

                {/* Blinking Pulse Dot only shows if not done */}
                {!isActionDone && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWizard ? 'bg-emerald-400' : 'bg-fuchsia-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></span>
                  </span>
                )}
            </>
        </button>

        {/* Telegram Redirect */}
        <button onClick={() => config?.telegramLink ? window.open(config.telegramLink, '_blank') : onEditConfig?.()}
            className={`p-2 rounded-full border transition-all hover:scale-110 active:scale-95 flex items-center justify-center relative group
                ${isWizard ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400' : 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-400'}`}
            title={config?.telegramLink ? "Join the Official Telegram Nexus" : "Configure Secure Telegram Uplink Link"}
        >
            <Send size={16} />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
        </button>

        {/* System Status Display */}
        <div className="text-right leading-tight opacity-70" title="System Status: Power Level and Local Synchronized Time">
          <div className="text-[10px] font-bold flex items-center justify-end gap-1">
             {getBatteryIcon()} {battery ? `${Math.round(battery.level * 100)}%` : ''}
          </div>
          <div className="text-[10px] font-mono hidden sm:block">{formatDate(time)} {formatTime(time)}</div>
        </div>

        {/* Profile/Tools Trigger */}
        <button onClick={onOpenTools} className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 overflow-hidden ${isWizard ? 'bg-emerald-900/50 border-emerald-500' : 'bg-fuchsia-900/50 border-fuchsia-500'}`} title="Identity Gate: Access Settings, Themes and Neural Profile">
            <User size={16} />
        </button>
      </div>
    </div>
  );
};

export default HUD;