
import React, { useState, useEffect } from 'react';
import { Lineage, type UserProfile, SECTORS } from '../types';
import { GlobalConfig } from '../App';
import { X, Clock, ClipboardList, User, Palette, Save, Type, PaintBucket, LayoutTemplate } from 'lucide-react';
import Pomodoro from './Pomodoro';
import Kanban from './Kanban';
import StudentID from './StudentID';

interface ToolsModalProps {
  lineage: Lineage;
  onClose: () => void;
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  config?: GlobalConfig;
}

const ToolsModal: React.FC<ToolsModalProps> = ({ lineage, onClose, profile, setProfile, config }) => {
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks' | 'profile'>('timer');
  const isWizard = lineage === Lineage.WIZARD;

  // Local State for Profile Editing
  const [editProfile, setEditProfile] = useState<UserProfile>(profile);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditProfile(profile);
  }, [profile]);

  useEffect(() => {
    setHasChanges(JSON.stringify(editProfile) !== JSON.stringify(profile));
  }, [editProfile, profile]);

  const handleSaveProfile = () => {
    setProfile(editProfile);
    setHasChanges(false);
    // Visual feedback
    const btn = document.getElementById('save-btn');
    if(btn) {
        const originalText = btn.innerText;
        btn.innerText = "SAVED!";
        setTimeout(() => btn.innerText = originalText, 2000);
    }
  };

  const fonts = [
      { id: 'wizard', name: 'Wizard Serif (Default)', family: '"EB Garamond", serif' },
      { id: 'muggle', name: 'Muggle Mono (Default)', family: '"JetBrains Mono", monospace' },
      { id: 'sans', name: 'Modern Sans', family: '"Inter", sans-serif' },
      { id: 'playfair', name: 'Playfair Display', family: '"Playfair Display", serif' },
      { id: 'orbitron', name: 'Orbitron Cyber', family: '"Orbitron", sans-serif' },
      { id: 'montserrat', name: 'Montserrat Clean', family: '"Montserrat", sans-serif' },
      { id: 'courier', name: 'Courier Prime', family: '"Courier Prime", monospace' },
  ];

  const themeColors = [
      { id: '', name: 'Default Lineage Color' },
      { id: '#f43f5e', name: 'Crimson Red' }, // Rose 500
      { id: '#d97706', name: 'Amber Gold' }, // Amber 600
      { id: '#84cc16', name: 'Lime Venom' }, // Lime 500
      { id: '#06b6d4', name: 'Cyan Neon' }, // Cyan 500
      { id: '#6366f1', name: 'Indigo Spirit' }, // Indigo 500
      { id: '#a855f7', name: 'Purple Haze' }, // Purple 500
      { id: '#ec4899', name: 'Pink Punk' }, // Pink 500
      { id: '#ffffff', name: 'Spectral White' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fade-in-up_0.2s_ease-out]">
      <div className={`w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden relative
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
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
           {activeTab === 'timer' && <Pomodoro lineage={lineage} config={config} />}
           {activeTab === 'tasks' && <Kanban lineage={lineage} />}
           {activeTab === 'profile' && (
               <div className="h-full flex flex-col md:flex-row gap-6">
                   {/* Left: ID Card Preview */}
                   <div className="flex-1 flex flex-col items-center">
                       <h4 className={`mb-4 text-xs font-bold uppercase tracking-widest opacity-70 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}>Digital Identification</h4>
                       <div className="scale-90 md:scale-100 origin-top">
                           <StudentID lineage={lineage} profile={profile} />
                       </div>
                       
                       <div className={`mt-6 p-4 rounded-lg border w-full max-w-sm ${isWizard ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-fuchsia-950/20 border-fuchsia-900/50'}`}>
                           <h5 className="font-bold mb-2 text-sm text-white">Your Statistics</h5>
                           <div className="grid grid-cols-2 gap-4 text-xs">
                               <div>
                                   <span className="opacity-50 block">Total Visits</span>
                                   <span className="text-lg font-mono">{profile.visitCount}</span>
                               </div>
                               <div>
                                   <span className="opacity-50 block">Time Spent</span>
                                   <span className="text-lg font-mono">{(profile.totalTimeSpent / 60).toFixed(1)} m</span>
                               </div>
                               <div className="col-span-2">
                                   <span className="opacity-50 block">Last Active</span>
                                   <span className="font-mono opacity-80">{new Date(profile.lastActive).toLocaleString()}</span>
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* Right: Customization Form */}
                   <div className={`flex-1 overflow-y-auto pr-2 space-y-6 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
                       
                       {/* Name Input */}
                       <div className="space-y-2">
                           <label className="flex items-center gap-2 text-sm font-bold text-white">
                               <User size={16} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}/> Display Name
                           </label>
                           <input 
                             type="text" 
                             value={editProfile.displayName}
                             onChange={(e) => setEditProfile({...editProfile, displayName: e.target.value})}
                             placeholder="Enter your name..."
                             className={`w-full p-3 rounded-lg border bg-black/40 outline-none transition-all
                                ${isWizard ? 'border-emerald-800 focus:border-emerald-500 text-emerald-100' : 'border-fuchsia-800 focus:border-fuchsia-500 text-fuchsia-100'}
                             `}
                           />
                       </div>

                       {/* House/Sector Selector */}
                       <div className="space-y-2">
                           <label className="flex items-center gap-2 text-sm font-bold text-white">
                               <LayoutTemplate size={16} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}/> Default Sector
                           </label>
                           <select 
                             value={editProfile.defaultSector || 'announcements'}
                             onChange={(e) => setEditProfile({...editProfile, defaultSector: e.target.value})}
                             className={`w-full p-3 rounded-lg border bg-black/40 outline-none
                                ${isWizard ? 'border-emerald-800 focus:border-emerald-500 text-emerald-100' : 'border-fuchsia-800 focus:border-fuchsia-500 text-fuchsia-100'}
                             `}
                           >
                               {SECTORS.map(s => (
                                   <option key={s.id} value={s.id} className="bg-black text-white">
                                       {isWizard ? s.wizardName : s.muggleName}
                                   </option>
                               ))}
                           </select>
                           <p className="text-[10px] opacity-50">This sector will open automatically when you visit.</p>
                       </div>

                       {/* Font Selector */}
                       <div className="space-y-2">
                           <label className="flex items-center gap-2 text-sm font-bold text-white">
                               <Type size={16} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}/> Interface Font
                           </label>
                           <div className="grid grid-cols-1 gap-2">
                               {fonts.map(font => (
                                   <button
                                     key={font.id}
                                     onClick={() => setEditProfile({...editProfile, preferredFont: font.id as any})}
                                     className={`flex items-center justify-between p-3 rounded border text-left transition-all
                                        ${editProfile.preferredFont === font.id 
                                            ? (isWizard ? 'bg-emerald-900/40 border-emerald-500 text-white' : 'bg-fuchsia-900/40 border-fuchsia-500 text-white')
                                            : 'border-white/10 hover:bg-white/5 text-gray-400'}
                                     `}
                                   >
                                       <span style={{ fontFamily: font.family }}>{font.name}</span>
                                       {editProfile.preferredFont === font.id && <div className={`w-2 h-2 rounded-full ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>}
                                   </button>
                               ))}
                           </div>
                       </div>

                       {/* Theme Color Picker */}
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
                           <p className="text-[10px] opacity-50">This color will subtly override the default lineage theme.</p>
                       </div>

                       <div className="pt-4 sticky bottom-0 bg-gradient-to-t from-black via-black to-transparent pb-2">
                           <button 
                             id="save-btn"
                             onClick={handleSaveProfile}
                             disabled={!hasChanges}
                             className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all
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
  );
};

export default ToolsModal;
