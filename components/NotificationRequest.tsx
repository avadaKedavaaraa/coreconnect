import React, { useState } from 'react';
import { Lineage } from '../types';
import { Bell, BellOff, Bird, Radio, X, Check, ShieldAlert, Loader2, Wifi, Zap, Activity } from 'lucide-react';
import { NotificationService } from '../services/NotificationService';

interface NotificationRequestProps {
  lineage: Lineage;
  onClose: () => void;
  onEnable: () => void;
  onDisable: () => void;
}

const NotificationRequest: React.FC<NotificationRequestProps> = ({ lineage, onClose, onEnable, onDisable }) => {
  const isWizard = lineage === Lineage.WIZARD;
  const [hoverState, setHoverState] = useState<'enable' | 'disable' | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'accepted' | 'denied' | 'error'>('idle');

  // Theme Config
  const theme = {
    title: isWizard ? "Owl Post Service" : "System Uplink Request",
    icon: isWizard ? <Bird size={42} className="animate-bounce" /> : <Radio size={42} className="animate-pulse" />,
    description: isWizard 
      ? "Shall we send a swift owl when new decrees are posted?" 
      : "Initialize real-time data sync for new announcements?",
    enableBtn: isWizard ? "Accept Owls" : "Establish Link",
    disableBtn: isWizard ? "Ban Owls" : "Sever Connection",
    hoverEnable: isWizard 
      ? "Receive a magical summons instantly when the High Council speaks." 
      : "Push notifications enabled. Latency: 0ms. Coverage: 100%.",
    hoverDisable: isWizard
      ? "You shall remain in the dark until you return manually."
      : "Auto-sync disabled. Manual refresh required for updates.",
    bg: isWizard ? "bg-[#0a0f0a] border-emerald-600" : "bg-[#0f0a15] border-fuchsia-600",
    glow: isWizard ? "shadow-emerald-900/50" : "shadow-fuchsia-900/50",
    text: isWizard ? "text-emerald-100" : "text-fuchsia-100",
    accent: isWizard ? "text-emerald-400" : "text-fuchsia-400",
    btnPrimary: isWizard ? "bg-emerald-600 hover:bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-fuchsia-600 hover:bg-fuchsia-500 text-black shadow-[0_0_15px_rgba(217,70,239,0.4)]",
    btnSecondary: isWizard ? "border-emerald-800 hover:bg-emerald-900/30 text-emerald-300" : "border-fuchsia-800 hover:bg-fuchsia-900/30 text-fuchsia-300"
  };

  const handleSubscribe = async () => {
      setStatus('loading');
      const success = await NotificationService.subscribeUser();
      
      if (success) {
          setStatus('accepted');
          // Update parent state
          onEnable();
          // Shortened delay for snappier experience (0.8s)
          setTimeout(onClose, 800);
      } else {
          setStatus('error');
          // Fallback - If error, let user try again or close manually
          // Do NOT auto-close on error so they can read it
      }
  };

  const handleDeny = () => {
      setStatus('denied');
      NotificationService.unsubscribeUser();
      onDisable();
      setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fade-in_0.2s]">
      <div className={`relative w-full max-w-md p-8 rounded-2xl border-2 shadow-2xl flex flex-col items-center text-center gap-6 overflow-hidden transition-all duration-300 transform scale-100 ${theme.bg} ${theme.glow}`}>
        
        {/* Background Effects */}
        <div className={`absolute inset-0 opacity-20 pointer-events-none ${isWizard ? 'bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,_#d946ef_0%,_transparent_70%)]'}`}></div>
        
        {/* Advanced Scanning Animation */}
        <div className={`absolute inset-0 pointer-events-none overflow-hidden`}>
            <div className={`w-full h-2 absolute top-0 opacity-50 blur-sm animate-[scan-fast_2s_linear_infinite] ${isWizard ? 'bg-emerald-400' : 'bg-fuchsia-400'}`}></div>
            <div className={`absolute inset-0 border-2 rounded-2xl opacity-30 animate-pulse ${isWizard ? 'border-emerald-500' : 'border-fuchsia-500'}`}></div>
        </div>

        {/* VIEW: STATUS MESSAGE */}
        {status !== 'idle' ? (
            <div className="flex flex-col items-center justify-center py-8 animate-[scale-in_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)] w-full">
                
                <div className="relative mb-6">
                    {/* Ring Pulse */}
                    {status === 'loading' && (
                        <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>
                    )}
                    
                    <div className={`relative p-6 rounded-full border-2 z-10 bg-black 
                        ${status === 'accepted' 
                            ? (isWizard ? 'border-emerald-500 text-emerald-400' : 'border-green-500 text-green-400') 
                            : status === 'loading'
                            ? (isWizard ? 'border-emerald-700 text-emerald-200' : 'border-fuchsia-700 text-fuchsia-200')
                            : 'border-red-500 text-red-400'
                        }
                    `}>
                        {status === 'accepted' ? <Check size={48} className="animate-[scale-up_0.2s]" /> : 
                         status === 'loading' ? <Activity size={48} className="animate-spin" /> : 
                         <ShieldAlert size={48} className="animate-bounce" />}
                    </div>
                </div>

                <h3 className={`text-2xl font-bold tracking-widest uppercase mb-2 ${theme.text} ${isWizard ? 'font-wizardTitle' : 'font-muggle'}`}>
                    {status === 'accepted' 
                        ? (isWizard ? "Owls Dispatched!" : "Uplink Secure") 
                        : status === 'loading' ? (isWizard ? "Summoning..." : "Connecting...")
                        : (status === 'error' ? "Connection Failed" : (isWizard ? "Silence Chosen" : "Link Severed"))}
                </h3>
                {status === 'error' && (
                    <p className="text-sm text-red-400 max-w-[80%]">
                        Failed to register with the archives. Check console for details.
                    </p>
                )}
                <div className={`h-1 w-24 rounded-full mx-auto ${status === 'loading' ? 'animate-pulse' : ''} ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>
            </div>
        ) : (
            /* VIEW: REQUEST FORM */
            <>
                {/* Icon Container with Radar Effect */}
                <div className={`relative z-10 p-6 rounded-full border-2 transition-transform hover:scale-110 duration-300 group ${isWizard ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400' : 'bg-fuchsia-950/50 border-fuchsia-500 text-fuchsia-400'}`}>
                    {theme.icon}
                    {/* Radar Circles */}
                    <div className={`absolute inset-0 rounded-full border border-current opacity-30 animate-ping`}></div>
                    <div className={`absolute inset-[-10px] rounded-full border border-current opacity-10 animate-pulse`}></div>
                </div>

                <div className="relative z-10 space-y-3">
                    <h3 className={`text-3xl font-bold tracking-widest uppercase drop-shadow-md ${theme.text} ${isWizard ? 'font-wizardTitle' : 'font-muggle'}`}>
                        {theme.title}
                    </h3>
                    <p className={`text-base leading-relaxed max-w-xs mx-auto ${isWizard ? 'font-wizard text-emerald-200/80' : 'font-muggle text-fuchsia-200/80'}`}>
                        {theme.description}
                    </p>
                </div>

                {/* Dynamic Context Message */}
                <div className={`relative z-10 min-h-[3rem] flex items-center justify-center w-full bg-black/40 rounded-lg border border-white/5`}>
                    <p className={`text-xs italic transition-all duration-300 px-4 py-2
                        ${hoverState ? 'opacity-100' : 'opacity-0'} 
                        ${theme.accent}
                    `}>
                        {hoverState === 'enable' ? theme.hoverEnable : hoverState === 'disable' ? theme.hoverDisable : '...'}
                    </p>
                </div>

                {/* Actions */}
                <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full mt-2">
                    <button 
                        onClick={handleDeny}
                        onMouseEnter={() => setHoverState('disable')}
                        onMouseLeave={() => setHoverState(null)}
                        className={`flex-1 py-4 px-4 rounded-xl font-bold border transition-all flex items-center justify-center gap-2 group hover:bg-opacity-20 ${theme.btnSecondary}`}
                    >
                        <BellOff size={18} className="group-hover:rotate-12 transition-transform"/>
                        {theme.disableBtn}
                    </button>

                    <button 
                        onClick={handleSubscribe}
                        onMouseEnter={() => setHoverState('enable')}
                        onMouseLeave={() => setHoverState(null)}
                        className={`flex-1 py-4 px-4 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden group ${theme.btnPrimary}`}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {isWizard ? <Zap size={18} className="animate-pulse"/> : <Radio size={18} className="animate-pulse"/>}
                            {theme.enableBtn}
                        </span>
                        {/* Button Shine Effect */}
                        <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
                    </button>
                </div>

                <button onClick={onClose} className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity text-white hover:rotate-90 duration-300">
                    <X size={24} />
                </button>
            </>
        )}

        <style dangerouslySetInnerHTML={{__html: `
            @keyframes scan-fast { 0% { top: 0; opacity: 0; } 50% { opacity: 0.5; } 100% { top: 100%; opacity: 0; } }
            @keyframes scale-in { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            @keyframes scale-up { 0% { transform: scale(0); } 80% { transform: scale(1.2); } 100% { transform: scale(1); } }
            @keyframes shimmer { 100% { transform: translateX(100%); } }
        `}} />
      </div>
    </div>
  );
};

export default NotificationRequest;