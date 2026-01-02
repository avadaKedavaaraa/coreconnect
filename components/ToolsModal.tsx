
import React, { useState, useEffect } from 'react';
import { Lineage, type UserProfile, SECTORS } from '../types';
import { GlobalConfig } from '../App';
import { X, Clock, ClipboardList, User, Palette, Save, Type, PaintBucket, LayoutTemplate, Plus, Link as LinkIcon, Eye, Sun, Moon, Accessibility, Activity } from 'lucide-react';
import Pomodoro from './Pomodoro';
import Kanban from './Kanban';
import StudentID from './StudentID';

interface ToolsModalProps {
  lineage: Lineage;
  onClose: () => void;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  config?: GlobalConfig;
}

const ToolsModal: React.FC<ToolsModalProps> = ({ lineage, onClose, profile, setProfile, config }) => {
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks' | 'profile'>('profile');
  const [showFontPanel, setShowFontPanel] = useState(false);
  const isWizard = lineage === Lineage.WIZARD;

  // Local State for Profile Editing
  const [editProfile, setEditProfile] = useState<UserProfile>(profile);
  const [hasChanges, setHasChanges] = useState(false);

  // Check for changes
  useEffect(() => {
    const isDifferent = 
        editProfile.displayName !== profile.displayName ||
        editProfile.preferredFont !== profile.preferredFont ||
        editProfile.themeColor !== profile.themeColor ||
        editProfile.highContrast !== profile.highContrast ||
        editProfile.brightness !== profile.brightness ||
        editProfile.contrast !== profile.contrast;
    setHasChanges(isDifferent);
  }, [editProfile, profile]);

  const handleSaveProfile = () => {
    setProfile(prev => ({
        ...prev,
        displayName: editProfile.displayName,
        preferredFont: editProfile.preferredFont,
        themeColor: editProfile.themeColor,
        highContrast: editProfile.highContrast,
        brightness: editProfile.brightness,
        contrast: editProfile.contrast
    }));
    setHasChanges(false);
    const btn = document.getElementById('save-btn');
    if(btn) {
        const originalText = btn.innerText;
        btn.innerText = "SAVED!";
        setTimeout(() => btn.innerText = originalText, 2000);
    }
  };

  // EXTENDED FONTS LIST (Google Fonts mainly)
  const defaultFonts = [
      { id: 'wizard', name: 'Wizard Serif', family: '"EB Garamond", serif' },
      { id: 'muggle', name: 'Muggle Mono', family: '"JetBrains Mono", monospace' },
      { id: 'sans', name: 'Modern Sans', family: '"Inter", sans-serif' },
  ];

  const extraFonts = [
      { id: 'playfair', name: 'Playfair Display', family: '"Playfair Display", serif' },
      { id: 'orbitron', name: 'Orbitron Cyber', family: '"Orbitron", sans-serif' },
      { id: 'montserrat', name: 'Montserrat Clean', family: '"Montserrat", sans-serif' },
      { id: 'courier', name: 'Courier Prime', family: '"Courier Prime", monospace' },
      { id: 'cursive', name: 'Dancing Script', family: '"Dancing Script", cursive' },
      { id: 'tech', name: 'Audiowide Tech', family: '"Audiowide", sans-serif' },
      { id: 'retro', name: 'Righteous Retro', family: '"Righteous", cursive' },
      { id: 'cinzel', name: 'Cinzel Cinematic', family: '"Cinzel", serif' },
      { id: 'oswald', name: 'Oswald Bold', family: '"Oswald", sans-serif' },
      { id: 'lato', name: 'Lato Neutral', family: '"Lato", sans-serif' },
      { id: 'raleway', name: 'Raleway Elegant', family: '"Raleway", sans-serif' },
      { id: 'lobster', name: 'Lobster Fun', family: '"Lobster", cursive' },
      { id: 'abril', name: 'Abril Fatface', family: '"Abril Fatface", cursive' },
      { id: 'shadows', name: 'Shadows Into Light', family: '"Shadows Into Light", cursive' },
      { id: 'pacifico', name: 'Pacifico Brush', family: '"Pacifico", cursive' },
      { id: 'exo', name: 'Exo 2 Sci-Fi', family: '"Exo 2", sans-serif' },
      { id: 'ubuntu', name: 'Ubuntu Tech', family: '"Ubuntu", sans-serif' },
      { id: 'vt323', name: 'VT323 Pixel', family: '"VT323", monospace' },
      { id: 'press', name: 'Press Start 2P', family: '"Press Start 2P", cursive' },
      { id: 'monoton', name: 'Monoton Lines', family: '"Monoton", cursive' },
  ];

  const themeColors = [
      { id: '', name: 'Default Lineage Color' },
      { id: '#f43f5e', name: 'Crimson Red' }, 
      { id: '#d97706', name: 'Amber Gold' }, 
      { id: '#84cc16', name: 'Lime Venom' }, 
      { id: '#06b6d4', name: 'Cyan Neon' }, 
      { id: '#6366f1', name: 'Indigo Spirit' }, 
      { id: '#a855f7', name: 'Purple Haze' }, 
      { id: '#ec4899', name: 'Pink Punk' }, 
      { id: '#ffffff', name: 'Spectral White' },
  ];

  // Helper to dynamically load a Google Font preview if needed
  const loadFontPreview = (fontName: string) => {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
  };

  const FontPanel = () => (
      <div className={`fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-[fade-in_0.2s]`}>
          <div className={`w-full max-w-3xl h-[80vh] flex flex-col rounded-xl border shadow-2xl relative
             ${isWizard ? 'bg-[#0a0f0a] border-emerald-600' : 'bg-[#0f0a15] border-fuchsia-600'}
          `}>
              <div className="p-4 border-b flex justify-between items-center shrink-0 border-white/10">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><Type size={20}/> Font Treasury</h3>
                  <button onClick={() => setShowFontPanel(false)} className="p-2 hover:bg-white/10 rounded-full text-white"><X size={24}/></button>
              </div>
              
              <div className="p-4 flex gap-2 border-b border-white/10 bg-black/20">
                  {/* Removed autoFocus to prevent scroll jumping on mobile */}
                  <input placeholder="Enter Custom Google Font Name (e.g. 'Roboto Slab')" className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none" id="custom-font-input" />
                  <button 
                    onClick={() => {
                        const input = document.getElementById('custom-font-input') as HTMLInputElement;
                        if(input.value) {
                            loadFontPreview(input.value);
                            setEditProfile({...editProfile, preferredFont: input.value as any});
                            setShowFontPanel(false);
                        }
                    }}
                    className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 text-white text-xs font-bold"
                  >
                      LOAD
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...defaultFonts, ...extraFonts].map(font => {
                      const isSelected = editProfile.preferredFont === font.id;
                      return (
                          <button
                              key={font.id}
                              onClick={() => { setEditProfile({...editProfile, preferredFont: font.id as any}); setShowFontPanel(false); }}
                              className={`p-4 rounded border text-left flex flex-col gap-2 transition-all hover:scale-[1.02]
                                  ${isSelected 
                                      ? (isWizard ? 'bg-emerald-900/40 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-fuchsia-900/40 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.2)]') 
                                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'}
                              `}
                          >
                              <div className="flex justify-between items-center w-full">
                                  <span className="text-xs font-bold uppercase tracking-wider opacity-50">{font.name}</span>
                                  {isSelected && <Eye size={14} className={isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}/>}
                              </div>
                              <div className="text-2xl truncate" style={{ fontFamily: font.family }}>
                                  The quick brown fox jumps...
                              </div>
                          </button>
                      );
                  })}
              </div>
          </div>
      </div>
  );

  return (
    <>
    {showFontPanel && <FontPanel />}
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fade-in-up_0.2s_ease-out]">
      <div className={`w-full max-w-4xl h-[90dvh] md:h-auto md:max-h-[85vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden relative
         ${isWizard ? 'bg-[#0a0f0a] border-emerald-600' : 'bg-[#0f0a15] border-fuchsia-600'}
      `}
      style={editProfile.themeColor ? { borderColor: editProfile.themeColor } : {}}
      >
        {/* Header */}
        <div className={`p-4 border-b flex justify-between items-center shrink-0 ${isWizard ? 'border-emerald-900 bg-emerald-950/20' : 'border-fuchsia-900 bg-fuchsia-950/20'}`}>
           <h3 className={`text-xl font-bold ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`} style={editProfile.themeColor ? { color: editProfile.themeColor } : {}}>
             {isWizard ? 'Scholar\'s Satchel' : 'User_Config_Matrix'}
           </h3>
           <button onClick={onClose} className={`hover:scale-110 transition-transform ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} style={editProfile.themeColor ? { color: editProfile.themeColor } : {}}>
             <X size={24} />
           </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b shrink-0 overflow-x-auto ${isWizard ? 'border-emerald-900' : 'border-fuchsia-900'}`}>
           <button 
             onClick={() => setActiveTab('profile')}
             className={`flex-1 min-w-[120px] p-3 flex items-center justify-center gap-2 text-sm transition-colors whitespace-nowrap
               ${activeTab === 'profile' 
                 ? (isWizard ? 'bg-emerald-900/30 text-emerald-100' : 'bg-fuchsia-900/30 text-fuchsia-100') 
                 : 'opacity-50 hover:opacity-100'}
               ${isWizard ? 'font-wizard' : 'font-muggle'}
             `}
           >
             <User size={16} /> <span>{isWizard ? 'Identity & Style' : 'Profile & UI'}</span>
           </button>
           <button 
             onClick={() => setActiveTab('timer')}
             className={`flex-1 min-w-[100px] p-3 flex items-center justify-center gap-2 text-sm transition-colors whitespace-nowrap
               ${activeTab === 'timer' 
                 ? (isWizard ? 'bg-emerald-900/30 text-emerald-100' : 'bg-fuchsia-900/30 text-fuchsia-100') 
                 : 'opacity-50 hover:opacity-100'}
               ${isWizard ? 'font-wizard' : 'font-muggle'}
             `}
           >
             <Clock size={16} /> <span className="hidden sm:inline">{isWizard ? 'Timer' : 'Focus'}</span>
           </button>
           <button 
             onClick={() => setActiveTab('tasks')}
             className={`flex-1 min-w-[100px] p-3 flex items-center justify-center gap-2 text-sm transition-colors whitespace-nowrap
               ${activeTab === 'tasks' 
                 ? (isWizard ? 'bg-emerald-900/30 text-emerald-100' : 'bg-fuchsia-900/30 text-fuchsia-100') 
                 : 'opacity-50 hover:opacity-100'}
               ${isWizard ? 'font-wizard' : 'font-muggle'}
             `}
           >
             <ClipboardList size={16} /> <span className="hidden sm:inline">{isWizard ? 'Tasks' : 'Tickets'}</span>
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
           {activeTab === 'timer' && <Pomodoro lineage={lineage} config={config} />}
           {activeTab === 'tasks' && <Kanban lineage={lineage} />}
           {activeTab === 'profile' && (
               <div className="h-full flex flex-col md:flex-row gap-6">
                   {/* Left: ID Card Preview */}
                   <div className="flex-1 flex flex-col items-center shrink-0">
                       <h4 className={`mb-4 text-xs font-bold uppercase tracking-widest opacity-70 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}>Digital Identification</h4>
                       <div className="scale-90 md:scale-100 origin-top">
                           <StudentID lineage={lineage} profile={editProfile} />
                       </div>
                   </div>

                   {/* Right: Customization Form */}
                   <div className={`flex-1 overflow-y-auto pr-2 space-y-6 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
                       
                       {/* Display Name */}
                       <div className="space-y-2">
                           <label className="flex items-center gap-2 text-sm font-bold text-white">
                               <User size={16} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}/> Display Name
                           </label>
                           <input 
                             type="text" 
                             value={editProfile.displayName}
                             onChange={(e) => setEditProfile({...editProfile, displayName: e.target.value})}
                             placeholder="Enter your name..."
                             className={`w-full p-3 rounded-lg border bg-black/40 outline-none transition-all text-base
                                ${isWizard ? 'border-emerald-800 focus:border-emerald-500 text-emerald-100' : 'border-fuchsia-800 focus:border-fuchsia-500 text-fuchsia-100'}
                             `}
                           />
                       </div>

                       {/* Accessibility Controls */}
                       <div className={`p-4 rounded-lg border space-y-4 ${isWizard ? 'bg-emerald-950/20 border-emerald-800' : 'bg-fuchsia-950/20 border-fuchsia-800'}`}>
                           <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-2">
                               <Accessibility size={16} /> Vision & Display
                           </h4>
                           
                           <div className="flex justify-between items-center">
                               <div>
                                   <label className="text-sm font-bold text-white flex items-center gap-2">
                                       {editProfile.highContrast ? <Sun size={14} className="text-yellow-400" /> : <Moon size={14} />}
                                       High Contrast Mode
                                   </label>
                                   <p className="text-xs opacity-60 text-white/70">Boosts legibility.</p>
                               </div>
                               <button 
                                 onClick={() => setEditProfile(prev => ({...prev, highContrast: !prev.highContrast}))}
                                 className={`w-12 h-6 rounded-full p-1 transition-colors relative ${editProfile.highContrast ? (isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500') : 'bg-zinc-700'}`}
                               >
                                   <div className={`w-4 h-4 rounded-full bg-white transition-transform ${editProfile.highContrast ? 'translate-x-6' : 'translate-x-0'}`}></div>
                               </button>
                           </div>

                           <div>
                               <div className="flex justify-between text-xs mb-1 opacity-80 text-white">
                                   <span>Global Brightness</span>
                                   <span>{editProfile.brightness || 100}%</span>
                               </div>
                               <input 
                                 type="range" min="50" max="150" step="5"
                                 value={editProfile.brightness || 100}
                                 onChange={(e) => setEditProfile({...editProfile, brightness: Number(e.target.value)})}
                                 className="w-full accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                               />
                           </div>

                           <div>
                               <div className="flex justify-between text-xs mb-1 opacity-80 text-white">
                                   <span>Color Contrast</span>
                                   <span>{editProfile.contrast || 100}%</span>
                               </div>
                               <input 
                                 type="range" min="50" max="150" step="5"
                                 value={editProfile.contrast || 100}
                                 onChange={(e) => setEditProfile({...editProfile, contrast: Number(e.target.value)})}
                                 className="w-full accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                               />
                           </div>
                       </div>

                       {/* Fonts */}
                       <div className="space-y-2">
                           <label className="flex items-center gap-2 text-sm font-bold text-white">
                               <Type size={16} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}/> Interface Font
                           </label>
                           <div className="p-3 rounded-lg border bg-black/40 flex justify-between items-center text-white text-sm" style={{ borderColor: isWizard ? '#064e3b' : '#701a75' }}>
                               <span>Currently: <b className="uppercase">{editProfile.preferredFont || 'Default'}</b></span>
                           </div>
                           <button 
                             onClick={() => setShowFontPanel(true)}
                             className={`w-full py-3 rounded-lg border border-dashed flex items-center justify-center gap-2 transition-all hover:bg-white/5
                                ${isWizard ? 'border-emerald-500/50 text-emerald-300' : 'border-fuchsia-500/50 text-fuchsia-300'}
                             `}
                           >
                               <Plus size={16}/> EXPLORE 100+ FONTS
                           </button>
                       </div>

                       {/* Themes */}
                       <div className="space-y-2">
                           <label className="flex items-center gap-2 text-sm font-bold text-white">
                               <PaintBucket size={16} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}/> Soul Color
                           </label>
                           <div className="flex flex-wrap gap-3">
                               {themeColors.map(color => (
                                   <button
                                     key={color.id}
                                     onClick={() => setEditProfile({...editProfile, themeColor: color.id})}
                                     title={color.name}
                                     className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center
                                        ${editProfile.themeColor === color.id ? 'border-white scale-110 shadow-lg' : 'border-transparent'}
                                     `}
                                     style={{ backgroundColor: color.id || 'transparent', border: !color.id ? '1px dashed grey' : undefined }}
                                   >
                                       {!color.id && <span className="text-[8px] uppercase text-white font-bold opacity-70">Def</span>}
                                   </button>
                               ))}
                           </div>
                       </div>

                       <div className="pt-4 sticky bottom-0 bg-gradient-to-t from-black via-black to-transparent pb-2 z-10">
                           <button 
                             id="save-btn"
                             onClick={handleSaveProfile}
                             disabled={!hasChanges}
                             className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                                ${hasChanges 
                                    ? (isWizard ? 'bg-emerald-600 text-black hover:bg-emerald-500' : 'bg-fuchsia-600 text-black hover:bg-fuchsia-500') 
                                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
                             `}
                           >
                               <Save size={18} /> {hasChanges ? 'SAVE SETTINGS' : 'NO CHANGES'}
                           </button>
                       </div>
                   </div>
               </div>
           )}
        </div>
      </div>
    </div>
    </>
  );
};

export default ToolsModal;
