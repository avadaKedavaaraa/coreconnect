import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Sparkles, Zap, Bookmark } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PromotionManagerProps {
  isWizard: boolean;
}

const PromotionManager: React.FC<PromotionManagerProps> = ({ isWizard }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [status, setStatus] = useState<'prompt' | 'thanks'>('prompt');
  const [isMobile, setIsMobile] = useState(false);
  const [osCommand, setOsCommand] = useState('Ctrl + D');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Device and OS Detection
    const ua = navigator.userAgent;
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
    setIsMobile(mobile);

    if (!mobile) {
      const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform);
      setOsCommand(isMac ? '⌘ + D' : 'Ctrl + D');
    }

    // 2. Check if user should see the popup
    const hasSeen = localStorage.getItem('cc_promo_seen');
    const isDone = localStorage.getItem('cc_action_done');

    if (!hasSeen && !isDone) {
      const timer = setTimeout(() => setShowPopup(true), 2500);
      return () => clearTimeout(timer);
    }

    // 3. Listen for PC/Android Install Prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleAction = async () => {
    // --- STRICT DEVICE CHECK ---
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobileDevice) {
        // A. If Android Official Prompt is ready
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                finalize();
            }
            return;
        }

        // B. Fallback for iOS or Android without prompt
        alert("📲 To Install App:\n\n1. Tap your browser's Menu (⋮ or Share icon).\n2. Select 'Add to Home Screen' or 'Install App'.");
        
        // Mark as done so we don't annoy them
        finalize(); 
        return; 
    }

    // --- DESKTOP LOGIC ---
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            finalize();
            return;
        }
    }

    // Desktop Fallback: Bookmark
    alert(`🔖 Pro Tip: Press ${osCommand} to instantly bookmark this timeline!`);
    finalize();
  };

  const finalize = () => {
    // 🎉 Confetti Blast
    const colors = isWizard ? ['#10b981', '#34d399', '#ffffff'] : ['#d946ef', '#f0abfc', '#ffffff'];
    
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: colors,
      disableForReducedMotion: true
    });

    localStorage.setItem('cc_action_done', 'true');
    setStatus('thanks');
    
    // Notify HUD and Close
    setTimeout(() => {
      closePopup();
      window.dispatchEvent(new Event('storage')); // HUD updates its state
    }, 3500);
  };

  const closePopup = () => {
    localStorage.setItem('cc_promo_seen', 'true');
    setShowPopup(false);
  };

  // --- Theme Styles ---
  const themeBg = isWizard ? 'bg-emerald-500' : 'bg-fuchsia-600';
  const themeBorder = isWizard ? 'border-emerald-500/40' : 'border-fuchsia-500/40';
  const themeGlow = isWizard ? 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]' : 'shadow-[0_0_40px_-10px_rgba(217,70,239,0.3)]';
  const buttonGradient = isWizard 
    ? 'bg-gradient-to-r from-emerald-900 to-emerald-700 hover:from-emerald-800 hover:to-emerald-600 border-emerald-500/50' 
    : 'bg-gradient-to-r from-fuchsia-900 to-purple-800 hover:from-fuchsia-800 hover:to-purple-700 border-fuchsia-500/50';

  return (
    <AnimatePresence>
      {showPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          
          {/* 🌑 Glass Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePopup}
          />

          {/* 📦 Main Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={`
                relative w-full max-w-sm rounded-3xl overflow-hidden border ${themeBorder} ${themeGlow}
                bg-[#050505]/90 backdrop-blur-xl group
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 🌀 Rotating Nebula Effect */}
            <div className={`absolute -top-[50%] -left-[50%] w-[200%] h-[200%] opacity-20 animate-spin-slow pointer-events-none 
                bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,${isWizard ? '#10b981' : '#d946ef'}_100%)]`}>
            </div>
            
            <button onClick={closePopup} className="absolute top-4 right-4 z-20 p-2 text-white/30 hover:text-white transition-colors rounded-full hover:bg-white/10">
              <X size={18} />
            </button>

            {status === 'prompt' ? (
              <div className="relative z-10 p-8 flex flex-col items-center text-center space-y-6">
                
                {/* 🎨 Floating Icon UI */}
                <div className="relative">
                    <div className={`absolute inset-0 blur-2xl opacity-40 ${themeBg} animate-pulse-slow`}></div>
                    <div className={`
                        relative w-24 h-24 rounded-2xl flex items-center justify-center border border-white/10 
                        bg-gradient-to-br from-white/10 to-transparent shadow-2xl backdrop-blur-md animate-float
                    `}>
                        {isMobile ? (
                            <img src="https://img.icons8.com/?size=100&id=101121&format=png&color=000000" className="w-12 h-12 object-contain invert drop-shadow-lg" alt="Install" />
                        ) : (
                            <img src="https://img.icons8.com/?size=100&id=B7hNQrX3PbdD&format=png&color=000000" className="w-16 h-16 object-contain invert drop-shadow-lg" alt="Bookmark" />
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                  <h3 className={`text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 
                      ${isWizard ? 'font-wizardTitle' : 'font-muggle'}`}>
                    {isMobile ? "SYSTEM UPGRADE" : "SECURE UPLINK"}
                  </h3>
                  <p className="text-sm text-zinc-400 font-sans leading-relaxed px-2">
                    {isMobile 
                        ? "Install the interface for instant, full-screen offline access." 
                        : "Anchor this timeline to your browser to never lose your progress."}
                  </p>
                </div>

                {/* ⚡ Action Button */}
                <button
                  onClick={handleAction}
                  className={`
                    relative w-full py-3.5 rounded-xl font-bold text-white shadow-lg border-t border-l
                    overflow-hidden transition-all active:scale-95 group-hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.1)]
                    ${buttonGradient}
                  `}
                >
                  <div className="absolute inset-0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"></div>
                  
                  <div className="relative z-20 flex items-center justify-center gap-2 tracking-widest text-xs uppercase">
                    {isMobile ? (
                        <><span>Initialize Install</span> <Zap size={14} className="fill-white" /></>
                    ) : (
                        <><span>Execute Bookmark</span> <Bookmark size={14} className="fill-white" /></>
                    )}
                  </div>
                </button>

                <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                    {isWizard ? "Bind the magic to your device." : "System persistence recommended."}
                </p>
              </div>
            ) : (
              // 🎉 Success State
              <div className="relative z-10 p-10 flex flex-col items-center text-center space-y-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="relative">
                    <Heart size={64} className="text-red-500 fill-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                    <Sparkles size={24} className="absolute -top-2 -right-4 text-yellow-400 animate-spin-slow" />
                </motion.div>
                
                <h3 className={`text-xl font-bold text-white tracking-[0.2em] ${isWizard ? 'font-wizardTitle' : 'font-muggle'}`}>
                    CONNECTED
                </h3>
                <p className="text-zinc-500 text-xs font-mono">
                    {isWizard ? "The ley lines are now bound to you." : "Uplink established successfully."}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PromotionManager;