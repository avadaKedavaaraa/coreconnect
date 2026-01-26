import React from 'react';
import { Lineage, Sector, GlobalConfig } from '../types';
import * as LucideIcons from 'lucide-react'; // 👈 Import ALL icons dynamically

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
          ? 'bg-[#0a150a] border-emerald-800 shadow-[2px_0_20px_rgba(0,0,0,0.8)]' 
          : 'bg-[#150a1f] border-fuchsia-800 shadow-[2px_0_20px_rgba(0,0,0,0.8)]'}
      `}>
        {/* Header (Logo) */}
        <div className="h-20 flex items-center justify-center border-b border-white/10 overflow-hidden whitespace-nowrap relative shrink-0">
          <div className="absolute left-0 w-20 flex justify-center items-center h-full">
             {logoUrl ? (
                <div className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${isWizard ? 'border-emerald-400' : 'border-fuchsia-400'}`}>
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
             ) : (
                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-xl shadow-lg ${isWizard ? 'bg-emerald-900 text-emerald-300 font-wizardTitle border border-emerald-500' : 'bg-fuchsia-900 text-fuchsia-300 font-muggle border border-fuchsia-500'}`}>
                   {isWizard ? (config.wizardLogoText || 'C') : (config.muggleLogoText || 'CC')}
                </div>
             )}
          </div>
          {/* Label is visible if group-hover OR if sidebar is explicitly open (mobile) */}
          <div className={`transition-opacity duration-300 pl-20 pr-4 font-bold text-xl ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isWizard ? 'font-wizardTitle text-emerald-300' : 'font-muggle text-fuchsia-300'}`}>
             {isWizard ? config.wizardTitle : config.muggleTitle}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-4 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
          <ul className="space-y-3 px-3">
            {sectors.map((sector) => {
              const IconName = isWizard ? sector.wizardIcon : sector.muggleIcon;
              
              // ⚡️ DYNAMIC LOOKUP:
              // @ts-ignore
              const Icon = LucideIcons[IconName] || LucideIcons.CircleHelp;
              
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
                            ? 'bg-emerald-800 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500/50' 
                            : 'bg-fuchsia-800 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)] border border-fuchsia-500/50') 
                        : 'text-white/70 hover:text-white hover:bg-white/10'}
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
                      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${isWizard ? 'bg-emerald-300' : 'bg-fuchsia-300'}`} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer Info / Settings */}
        <div className="h-16 border-t border-white/10 flex items-center justify-center shrink-0 relative px-2 bg-black/20">
           <button 
             onClick={onOpenSettings}
             className={`w-full h-full flex items-center justify-center gap-2 hover:bg-white/10 transition-all group/settings
               ${isWizard ? 'text-emerald-400 hover:text-red-300' : 'text-fuchsia-400 hover:text-blue-300'}
             `}
             title="Admin Access"
           >
              {/* @ts-ignore */}
              <LucideIcons.Settings2 size={24} className="group-hover/settings:rotate-90 transition-transform" />
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