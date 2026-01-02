import React, { useState, useEffect, useRef } from 'react';
import { Lineage, SECTORS } from '../types';
import { Search, ArrowRight, Command } from 'lucide-react';

interface CommandPaletteProps {
  lineage: Lineage;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (sectorId: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ lineage, isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isWizard = lineage === Lineage.WIZARD;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredSectors = SECTORS.filter(s => 
    (isWizard ? s.wizardName : s.muggleName).toLowerCase().includes(query.toLowerCase()) ||
    s.id.includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredSectors.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredSectors.length) % filteredSectors.length);
    } else if (e.key === 'Enter') {
      if (filteredSectors[selectedIndex]) {
        onNavigate(filteredSectors[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div 
        className={`w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border transform transition-all animate-[fade-in-up_0.15s_ease-out]
          ${isWizard 
            ? 'bg-[#0f1510] border-emerald-500/50 shadow-emerald-900/40' 
            : 'bg-[#150f1a] border-fuchsia-500/50 shadow-fuchsia-900/40'}
        `}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <Search size={20} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} />
          <input 
            ref={inputRef}
            type="text" 
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder={isWizard ? "Incantation for..." : "sudo navigate to..."}
            className={`flex-1 bg-transparent outline-none text-lg ${isWizard ? 'font-wizard text-emerald-100 placeholder:text-emerald-800' : 'font-muggle text-fuchsia-100 placeholder:text-fuchsia-800'}`}
          />
          <div className="flex gap-1">
             <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">ESC</span>
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {filteredSectors.map((sector, idx) => (
            <button
              key={sector.id}
              onClick={() => { onNavigate(sector.id); onClose(); }}
              className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors
                ${idx === selectedIndex 
                  ? (isWizard ? 'bg-emerald-900/40 text-emerald-100' : 'bg-fuchsia-900/40 text-fuchsia-100') 
                  : 'text-white/40 hover:bg-white/5'}
              `}
            >
              <div className="flex items-center gap-3">
                 {/* Mock Icon */}
                 <div className={`w-1 h-8 rounded-full ${idx === selectedIndex ? (isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500') : 'bg-transparent'}`}></div>
                 <div>
                   <div className={`font-bold ${isWizard ? 'font-wizard text-lg' : 'font-muggle text-sm'}`}>
                     {isWizard ? sector.wizardName : sector.muggleName}
                   </div>
                   <div className="text-[10px] opacity-60 truncate max-w-[300px]">
                     {sector.description}
                   </div>
                 </div>
              </div>
              {idx === selectedIndex && <ArrowRight size={16} className="opacity-80" />}
            </button>
          ))}
          {filteredSectors.length === 0 && (
             <div className="p-8 text-center opacity-40 italic text-sm">
                {isWizard ? "The stars reveal nothing." : "Error: 404 Entity Not Found"}
             </div>
          )}
        </div>
        
        <div className={`px-4 py-2 border-t border-white/5 text-[10px] flex justify-between opacity-50 ${isWizard ? 'bg-emerald-950/20 text-emerald-400' : 'bg-fuchsia-950/20 text-fuchsia-400'}`}>
           <span>CoreConnect Navigation v1.0</span>
           <span>Use arrows to select</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;