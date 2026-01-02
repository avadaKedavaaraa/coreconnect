import React, { useState } from 'react';
import { Lineage } from '../types';
import { GlobalConfig } from '../App';
import { Sparkles, Terminal, Wand2, Cpu } from 'lucide-react';

interface IdentityGateProps {
  onSelect: (lineage: Lineage) => void;
  config: GlobalConfig;
}

const IdentityGate: React.FC<IdentityGateProps> = ({ onSelect, config }) => {
  const [selected, setSelected] = useState<Lineage | null>(null);

  // Default fallbacks if config images are missing (though App.tsx handles defaults)
  const wizardBg = config.wizardImage || 'https://images.unsplash.com/photo-1598153346810-860daa0d6cad?q=80&w=2070&auto=format&fit=crop';
  const muggleBg = config.muggleImage || 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop';

  const handleSelection = (lineage: Lineage) => {
    setSelected(lineage);
    // Allow animation to play before unmounting
    setTimeout(() => {
        onSelect(lineage);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-black overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-90"></div>
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 transition-all duration-1000 ${selected === Lineage.MUGGLE ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
          <Wand2 className={`w-16 h-16 text-emerald-500 mb-6 animate-float ${selected === Lineage.WIZARD ? 'scale-150 mb-12' : ''} transition-all duration-1000`} />
          <h2 className="text-4xl md:text-6xl font-wizardTitle text-emerald-100 mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            {config.wizardTitle}
          </h2>
          <p className={`font-wizard text-xl text-emerald-300/80 italic max-w-md transition-opacity duration-500 ${selected === Lineage.WIZARD ? 'opacity-0' : 'opacity-100'}`}>
            {config.wizardGateText}
          </p>
          {!selected && (
            <div className="mt-8 px-6 py-2 border border-emerald-500/30 rounded-full text-emerald-400 font-wizard text-sm tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-90"></div>
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 transition-all duration-1000 ${selected === Lineage.WIZARD ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
          <Cpu className={`w-16 h-16 text-fuchsia-500 mb-6 animate-pulse ${selected === Lineage.MUGGLE ? 'scale-150 mb-12' : ''} transition-all duration-1000`} />
          <h2 className="text-4xl md:text-6xl font-muggle text-fuchsia-100 mb-4 tracking-tighter drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]">
            {config.muggleTitle}
          </h2>
          <p className={`font-muggle text-lg text-fuchsia-300/80 max-w-md transition-opacity duration-500 ${selected === Lineage.MUGGLE ? 'opacity-0' : 'opacity-100'}`}>
            {config.muggleGateText} <span className="animate-blink">_</span>
          </p>
           {!selected && (
            <div className="mt-8 px-6 py-2 border border-fuchsia-500/30 rounded text-fuchsia-400 font-muggle text-xs tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500">
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