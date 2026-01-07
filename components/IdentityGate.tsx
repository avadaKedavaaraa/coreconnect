
import React, { useState, useEffect } from 'react';
import { Lineage, GlobalConfig } from '../types';
import { Sparkles, Terminal, Wand2, Cpu, ArrowRight, User } from 'lucide-react';

interface IdentityGateProps {
  onSelect: (lineage: Lineage, name?: string) => void;
  config: GlobalConfig;
}

const IdentityGate: React.FC<IdentityGateProps> = ({ onSelect, config }) => {
  const [selected, setSelected] = useState<Lineage | null>(null);
  const [name, setName] = useState('');
  const [hasName, setHasName] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check for existing name on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('core_connect_profile');
    if (savedProfile) {
        try {
            const parsed = JSON.parse(savedProfile);
            // Fix: Ignore default 'Guest' to ensure new users see the identification screen
            if (parsed.displayName && parsed.displayName !== 'Guest') {
                setName(parsed.displayName);
                setHasName(true);
            }
        } catch (e) {}
    }
  }, []);

  // Use Config images directly. These will update automatically when `config` prop changes.
  // Using fallbacks just in case the config is temporarily empty.
  const wizardBg = config.wizardImage || 'https://images.unsplash.com/photo-1598153346810-860daa0d6cad?q=80&w=2070&auto=format&fit=crop';
  const muggleBg = config.muggleImage || 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop';

  const handleNameSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim()) {
          setHasName(true);
          // Proceed to app now that we have name AND selection
          if (selected) {
              onSelect(selected, name);
          }
      }
  };

  const handleSelection = (lineage: Lineage) => {
    setSelected(lineage);
    setIsAnimating(true);
    
    // Wait for gate animation to finish (1s)
    setTimeout(() => {
        if (hasName) {
            // User already has a name, proceed immediately
            onSelect(lineage, name);
        } else {
            // User needs to identify themselves
            setShowNameInput(true);
        }
    }, 1000);
  };

  // 1. NAME ENTRY SCREEN (Shown ONLY after selection if name is missing)
  if (showNameInput) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden">
            {/* Background Ambience - Tailored to selection */}
            <div className="absolute inset-0 opacity-40">
                {selected === Lineage.WIZARD ? (
                    <div className="absolute top-0 left-0 w-full h-full bg-emerald-900/20 blur-[100px] animate-pulse-slow"></div>
                ) : (
                    <div className="absolute top-0 right-0 w-full h-full bg-fuchsia-900/20 blur-[100px] animate-pulse-slow"></div>
                )}
            </div>

            <div className={`relative z-10 w-full max-w-md p-8 bg-black/80 backdrop-blur-xl border rounded-2xl shadow-2xl animate-[fade-in-up_0.5s_ease-out]
                ${selected === Lineage.WIZARD ? 'border-emerald-500/30' : 'border-fuchsia-500/30'}
            `}>
                <div className="flex justify-center mb-6">
                    <div className={`w-16 h-16 rounded-full p-[2px] ${selected === Lineage.WIZARD ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}>
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                            <User size={32} className="text-white" />
                        </div>
                    </div>
                </div>
                
                <h2 className={`text-3xl font-bold text-center text-white mb-2 tracking-tight ${selected === Lineage.WIZARD ? 'font-wizardTitle' : 'font-muggle'}`}>
                    {selected === Lineage.WIZARD ? 'State Thy Name' : 'Identity Required'}
                </h2>
                <p className="text-center text-zinc-400 mb-8 text-sm">
                    {selected === Lineage.WIZARD ? 'To enter the archives, you must be known.' : 'Enter credentials to initialize session.'}
                </p>

                <form onSubmit={handleNameSubmit} className="space-y-6">
                    <div className="relative group">
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name..."
                            className={`w-full bg-black/50 border rounded-lg px-4 py-4 text-white placeholder:text-zinc-600 outline-none transition-all text-center text-base tracking-wider
                                ${selected === Lineage.WIZARD 
                                    ? 'border-emerald-900 focus:border-emerald-500 font-wizard' 
                                    : 'border-fuchsia-900 focus:border-fuchsia-500 font-muggle'}
                            `}
                            autoFocus
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={!name.trim()}
                        className={`w-full py-4 rounded-lg font-bold tracking-widest flex items-center justify-center gap-2 transition-all
                            ${name.trim() 
                                ? (selected === Lineage.WIZARD ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-black')
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
                        `}
                    >
                        <span>{selected === Lineage.WIZARD ? 'ENTER' : 'PROCEED'}</span>
                        <ArrowRight size={18} />
                    </button>
                </form>
            </div>
        </div>
      );
  }

  // 2. LINEAGE SELECTION SCREEN (Gate) - Initial View
  return (
    <div className="fixed inset-0 z-[100] flex flex-col md:flex-row bg-black overflow-hidden">
      {/* Wizard Side */}
      <div 
        onClick={() => !selected && handleSelection(Lineage.WIZARD)}
        className={`relative group cursor-pointer border-b md:border-b-0 md:border-r border-emerald-900/30 transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]
          ${selected === Lineage.WIZARD ? 'flex-[10] cursor-default' : selected === Lineage.MUGGLE ? 'flex-[0] w-0 opacity-0 overflow-hidden border-none' : 'flex-1 hover:flex-[1.5]'}
        `}
      >
        <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
            style={{ 
                backgroundImage: `url('${wizardBg}')`, 
                // Ensure opacity is high enough to see the image, dim only when not selected
                opacity: selected === Lineage.WIZARD ? 1 : 0.6, 
                filter: selected === Lineage.WIZARD ? 'none' : 'brightness(0.5)'
            }}
        ></div>
        <div className={`absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80 transition-opacity duration-1000 ${selected === Lineage.WIZARD ? 'opacity-40' : 'opacity-80'}`}></div>
        
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 transition-all duration-1000 ${selected === Lineage.MUGGLE ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
          <Wand2 className={`w-16 h-16 text-emerald-500 mb-6 animate-float ${selected === Lineage.WIZARD ? 'scale-150 mb-12' : ''} transition-all duration-1000 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]`} />
          <h2 className="text-4xl md:text-6xl font-wizardTitle text-emerald-100 mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] border-b border-transparent">
            {config.wizardTitle}
          </h2>
          <p className={`font-wizard text-2xl text-emerald-200 italic max-w-md transition-opacity duration-500 drop-shadow-md ${selected === Lineage.WIZARD ? 'opacity-0' : 'opacity-100'}`}>
            {config.wizardGateText}
          </p>
          {!selected && (
            <div className="mt-8 px-8 py-3 border border-emerald-500/50 bg-emerald-950/30 backdrop-blur-md rounded-full text-emerald-300 font-wizard text-lg tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                ENTER THE WIZARD PATH
            </div>
          )}
        </div>
        {/* Particle effects simulation */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-500 rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-emerald-400 rounded-full animate-pulse-slow delay-700"></div>
        </div>
      </div>

      {/* Muggle Side */}
      <div 
        onClick={() => !selected && handleSelection(Lineage.MUGGLE)}
        className={`relative group cursor-pointer transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]
          ${selected === Lineage.MUGGLE ? 'flex-[10] cursor-default' : selected === Lineage.WIZARD ? 'flex-[0] w-0 opacity-0 overflow-hidden' : 'flex-1 hover:flex-[1.5]'}
        `}
      >
        <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
            style={{ 
                backgroundImage: `url('${muggleBg}')`, 
                opacity: selected === Lineage.MUGGLE ? 1 : 0.6,
                filter: selected === Lineage.MUGGLE ? 'none' : 'brightness(0.5)'
            }}
        ></div>
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/80 transition-opacity duration-1000 ${selected === Lineage.MUGGLE ? 'opacity-40' : 'opacity-80'}`}></div>
        
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 transition-all duration-1000 ${selected === Lineage.WIZARD ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
          <Cpu className={`w-16 h-16 text-fuchsia-500 mb-6 animate-pulse ${selected === Lineage.MUGGLE ? 'scale-150 mb-12' : ''} transition-all duration-1000 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]`} />
          <h2 className="text-4xl md:text-6xl font-muggle text-fuchsia-100 mb-4 tracking-tighter drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]">
            {config.muggleTitle}
          </h2>
          <p className={`font-muggle text-lg text-fuchsia-200 max-w-md transition-opacity duration-500 drop-shadow-md ${selected === Lineage.MUGGLE ? 'opacity-0' : 'opacity-100'}`}>
            {config.muggleGateText} <span className="animate-blink">_</span>
          </p>
           {!selected && (
            <div className="mt-8 px-8 py-3 border border-fuchsia-500/50 bg-fuchsia-950/30 backdrop-blur-md rounded text-fuchsia-300 font-muggle text-xs tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                INITIALIZE MUGGLE PROTOCOL
            </div>
           )}
        </div>
        {/* Grid lines simulation */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(217,70,239,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>
    </div>
  );
};

export default IdentityGate;
