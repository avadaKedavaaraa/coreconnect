
import React, { useState, useEffect } from 'react';
import { Lineage } from '../types';
import { GlobalConfig } from '../App';
import { Sparkles, Terminal, Wand2, Cpu, ArrowRight, User } from 'lucide-react';

interface IdentityGateProps {
  onSelect: (lineage: Lineage, name?: string) => void;
  config: GlobalConfig;
}

const IdentityGate: React.FC<IdentityGateProps> = ({ onSelect, config }) => {
  const [selected, setSelected] = useState<Lineage | null>(null);
  const [name, setName] = useState('');
  const [hasName, setHasName] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check for existing name
  useEffect(() => {
    const savedProfile = localStorage.getItem('core_connect_profile');
    if (savedProfile) {
        try {
            const parsed = JSON.parse(savedProfile);
            if (parsed.displayName) {
                setName(parsed.displayName);
                setHasName(true);
            }
        } catch (e) {}
    }
  }, []);

  // Default fallbacks
  const wizardBg = config.wizardImage || 'https://images.unsplash.com/photo-1598153346810-860daa0d6cad?q=80&w=2070&auto=format&fit=crop';
  const muggleBg = config.muggleImage || 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop';

  const handleNameSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim()) {
          setHasName(true);
      }
  };

  const handleSelection = (lineage: Lineage) => {
    setSelected(lineage);
    setIsAnimating(true);
    // Allow animation to play before unmounting
    setTimeout(() => {
        onSelect(lineage, name);
    }, 1000);
  };

  // 1. NAME ENTRY SCREEN (If no name saved)
  if (!hasName) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 opacity-40">
                <div className="absolute top-0 left-0 w-1/2 h-full bg-emerald-900/20 blur-[100px]"></div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-fuchsia-900/20 blur-[100px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-8 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-[fade-in-up_0.5s_ease-out]">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-fuchsia-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                            <User size={32} className="text-white" />
                        </div>
                    </div>
                </div>
                
                <h2 className="text-3xl font-bold text-center text-white mb-2 font-sans tracking-tight">Identify Yourself</h2>
                <p className="text-center text-zinc-400 mb-8 text-sm">Enter your designation to access the Core Archives.</p>

                <form onSubmit={handleNameSubmit} className="space-y-6">
                    <div className="relative group">
                        {/* FIX: text-base to prevent iOS Zoom */}
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name..."
                            className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-4 text-white placeholder:text-zinc-600 outline-none focus:border-white/50 transition-all text-center text-base tracking-wider"
                            autoFocus
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={!name.trim()}
                        className={`w-full py-4 rounded-lg font-bold tracking-widest flex items-center justify-center gap-2 transition-all
                            ${name.trim() 
                                ? 'bg-white text-black hover:bg-zinc-200 hover:scale-[1.02]' 
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
                        `}
                    >
                        <span>PROCEED</span>
                        <ArrowRight size={18} />
                    </button>
                </form>
            </div>
        </div>
      );
  }

  // 2. LINEAGE SELECTION SCREEN (Gate)
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
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 mix-blend-overlay opacity-30 group-hover:opacity-50"
            style={{ backgroundImage: `url('${wizardBg}')`, opacity: selected === Lineage.WIZARD ? 0.6 : undefined }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/20 to-black opacity-90"></div>
        
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
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 mix-blend-screen opacity-30 group-hover:opacity-50"
            style={{ backgroundImage: `url('${muggleBg}')`, opacity: selected === Lineage.MUGGLE ? 0.6 : undefined }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black opacity-90"></div>
        
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
