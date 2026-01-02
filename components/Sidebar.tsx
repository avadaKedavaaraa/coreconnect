import React from 'react';
import { Lineage, Sector } from '../types';
import { GlobalConfig } from '../App';
// Explicitly import icons to avoid runtime errors with dynamic lookups
import { 
  Settings2, CircleHelp,
  Scroll, Megaphone,
  Bird, Hash,
  Feather, BellRing,
  Lock, Book,
  Waves, FileText,
  DoorOpen, Library,
  ScrollText, ClipboardList
} from 'lucide-react';

// Map string names from types.ts to actual Icon components
const ICON_MAP: Record<string, React.ElementType> = {
  'Scroll': Scroll,
  'Megaphone': Megaphone,
  'Bird': Bird,
  'Hash': Hash,
  'Feather': Feather,
  'BellRing': BellRing,
  'Lock': Lock,
  'Book': Book,
  'Waves': Waves,
  'FileText': FileText,
  'DoorOpen': DoorOpen,
  'Library': Library,
  'ScrollText': ScrollText,
  'ClipboardList': ClipboardList,
  'Settings2': Settings2,
  'CircleHelp': CircleHelp
};

interface SidebarProps {
  lineage: Lineage;
  sectors: Sector[];
  config: GlobalConfig;
  selectedSectorId: string;
  onSelectSector: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ lineage, sectors, config, selectedSectorId, onSelectSector, isOpen, setIsOpen, onOpenSettings }) => {
  const isWizard = lineage === Lineage.WIZARD;
  const logoUrl = isWizard ? config.wizardLogoUrl : config.muggleLogoUrl;

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Rail Container */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-40 h-full flex flex-col border-r backdrop-blur-xl transition-all duration-300 ease-out
        ${isOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-64'} 
        group
        ${isWizard 
          ? 'bg-[#050a05]/95 border-emerald-900/50 text-emerald-100 shadow-[2px_0_20px_rgba(0,0,0,0.5)]' 
          : 'bg-[#09050f]/95 border-fuchsia-900/50 text-fuchsia-100 shadow-[2px_0_20px_rgba(0,0,0,0.5)]'}
      `}>
        {/* Header (Logo) */}
        <div className="h-20 flex items-center justify-center border-b border-white/5 overflow-hidden whitespace-nowrap relative shrink-0">
          <div className="absolute left-0 w-20 flex justify-center items-center h-full">
             {logoUrl ? (
                <div className={`w-12 h-12 rounded-lg overflow-hidden border ${isWizard ? 'border-emerald-500/30' : 'border-fuchsia-500/30'}`}>
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
             ) : (
                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-xl ${isWizard ? 'bg-emerald-900/30 text-emerald-400 font-wizardTitle' : 'bg-fuchsia-900/30 text-fuchsia-400 font-muggle'}`}>
                   {isWizard ? (config.wizardLogoText || 'C') : (config.muggleLogoText || 'CC')}
                </div>
             )}
          </div>
          {/* Label is visible if group-hover OR if sidebar is explicitly open (mobile) */}
          <div className={`transition-opacity duration-300 pl-20 pr-4 font-bold text-xl ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isWizard ? 'font-wizardTitle text-emerald-400' : 'font-muggle text-fuchsia-400'}`}>
             {isWizard ? config.wizardTitle : config.muggleTitle}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-4 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
          <ul className="space-y-3 px-3">
            {sectors.map((sector) => {
              const IconName = isWizard ? sector.wizardIcon : sector.muggleIcon;
              // Safe lookup from map, fallback to CircleHelp
              const Icon = ICON_MAP[IconName] || CircleHelp;
              const isSelected = selectedSectorId === sector.id;

              return (
                <li key={sector.id}>
                  <button
                    onClick={() => {
                      onSelectSector(sector.id);
                      setIsOpen(false);
                    }}
                    className={`
                      relative w-full h-12 flex items-center rounded-lg transition-all duration-300
                      ${isSelected 
                        ? (isWizard 
                            ? 'bg-emerald-900/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                            : 'bg-fuchsia-900/40 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.2)]') 
                        : 'opacity-50 hover:opacity-100 hover:bg-white/5'}
                    `}
                  >
                    {/* Icon Container (Always visible) */}
                    <div className="absolute left-0 w-[54px] flex justify-center">
                       <Icon size={24} strokeWidth={isSelected ? 2.5 : 2} />
                    </div>

                    {/* Label (Visible on hover/expand OR if manually open) */}
                    <span className={`pl-[54px] pr-4 whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isWizard ? 'font-wizard text-lg' : 'font-muggle text-xs font-bold'}`}>
                      {isWizard ? sector.wizardName : sector.muggleName}
                    </span>
                    
                    {/* Active Bar */}
                    {isSelected && (
                      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${isWizard ? 'bg-emerald-400' : 'bg-fuchsia-400'}`} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer Info / Settings */}
        <div className="h-16 border-t border-white/5 flex items-center justify-center shrink-0 relative px-2">
           <button 
             onClick={onOpenSettings}
             className={`w-full h-full flex items-center justify-center gap-2 hover:bg-white/5 transition-all group/settings
               ${isWizard ? 'text-emerald-500 hover:text-red-400' : 'text-fuchsia-500 hover:text-blue-400'}
             `}
             title="Admin Access"
           >
              <Settings2 size={24} className="group-hover/settings:rotate-90 transition-transform" />
              <span className={`text-xs uppercase tracking-widest transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isWizard ? 'font-wizard' : 'font-muggle'}`}>
                System Config
              </span>
           </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;