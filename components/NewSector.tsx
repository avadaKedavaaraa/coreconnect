import React, { useState } from 'react';
import { Sector } from '../types';
import { X, Save, LayoutTemplate, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface NewSectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newSector: Sector, position: number) => void;
    existingSectors: Sector[];
    isWizard: boolean;
}

// A curated list of cool icons for the picker
const ICON_LIST = [
    'Folder', 'FolderOpen', 'FileText', 'Book', 'Library', 'GraduationCap', 
    'Scroll', 'Feather', 'PenTool', 'FlaskConical', 'Beaker', 'TestTube', 
    'Zap', 'BrainCircuit', 'Cpu', 'Database', 'Server', 'HardDrive', 
    'Wifi', 'Signal', 'Radio', 'Globe', 'Map', 'Compass', 
    'Shield', 'Sword', 'Crown', 'Gem', 'Ghost', 'Skull', 
    'Megaphone', 'Bell', 'Inbox', 'Mail', 'Send', 'Paperclip', 
    'Calendar', 'Clock', 'Hourglass', 'Timer', 'Watch', 
    'Camera', 'Video', 'Film', 'Music', 'Mic', 'Headphones',
    'Code', 'Terminal', 'Hash', 'Braces', 'Command', 'Laptop',
    'Sun', 'Moon', 'Cloud', 'CloudLightning', 'Snowflake', 'Flame', 'Droplets'
];

export const NewSector: React.FC<NewSectorProps> = ({ isOpen, onClose, onSave, existingSectors, isWizard }) => {
    const [formData, setFormData] = useState<Sector>({
        id: '',
        wizardName: '',
        muggleName: '',
        wizardIcon: 'Folder',
        muggleIcon: 'Folder',
        description: '',
        sortOrder: 'newest',
        uiTemplate: 'announcements'
    });
    
    const [placement, setPlacement] = useState<'before' | 'after'>('after');
    const [relativeSectorId, setRelativeSectorId] = useState<string>(existingSectors[existingSectors.length - 1]?.id || '');
    const [iconSearch, setIconSearch] = useState('');
    const [activeIconTab, setActiveIconTab] = useState<'wizard' | 'muggle'>('wizard');

    if (!isOpen) return null;

    const handleSave = () => {
        const finalId = formData.id || formData.muggleName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const relativeIndex = existingSectors.findIndex(s => s.id === relativeSectorId);
        let finalIndex = relativeIndex;
        if (placement === 'after') finalIndex += 1;
        if (finalIndex < 0) finalIndex = 0;

        onSave({ ...formData, id: finalId }, finalIndex);
        onClose();
    };

    const templates = [
        { id: 'announcements', name: 'Feed', icon: '📜' },
        { id: 'lectures', name: 'Schedule', icon: '🕰️' },
        { id: 'books', name: 'Library', icon: '📚' },
        { id: 'resources', name: 'Links', icon: '🌳' },
        { id: 'tasks', name: 'Tasks', icon: '✅' },
    ];

    // Filter icons based on search
    const filteredIcons = ICON_LIST.filter(icon => icon.toLowerCase().includes(iconSearch.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-[fade-in_0.2s]">
            <div className={`w-full max-w-4xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isWizard ? 'bg-[#0a0f0a] border-emerald-500/30' : 'bg-[#0f0a15] border-fuchsia-500/30'}`}>
                
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="font-bold text-xl flex items-center gap-2">
                        <LayoutTemplate size={20} /> Create New Sector
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex flex-col md:flex-row h-full overflow-hidden">
                    
                    {/* LEFT COLUMN: SETTINGS */}
                    <div className="w-full md:w-1/2 p-6 overflow-y-auto space-y-6 border-r border-white/10">
                        
                        {/* 1. ID & Names */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase opacity-50">1. Basic Info</h4>
                            <input 
                                value={formData.id} 
                                onChange={e => setFormData({...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                                placeholder="Unique ID (e.g. dark_arts)"
                                className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm font-mono"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input value={formData.wizardName} onChange={e => setFormData({...formData, wizardName: e.target.value})} className="p-2 bg-emerald-900/20 border border-emerald-500/30 rounded text-sm text-emerald-100 placeholder:text-emerald-500/50" placeholder="Wizard Name" />
                                <input value={formData.muggleName} onChange={e => setFormData({...formData, muggleName: e.target.value})} className="p-2 bg-fuchsia-900/20 border border-fuchsia-500/30 rounded text-sm text-fuchsia-100 placeholder:text-fuchsia-500/50" placeholder="Muggle Name" />
                            </div>
                        </div>

                        {/* 2. Positioning */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase opacity-50">2. Position</h4>
                            <div className="flex items-center gap-2 bg-white/5 p-2 rounded">
                                <div className="flex bg-black rounded p-1">
                                    <button onClick={() => setPlacement('before')} className={`px-2 py-1 rounded text-xs ${placement === 'before' ? 'bg-white text-black' : 'text-white/50'}`}>BEFORE</button>
                                    <button onClick={() => setPlacement('after')} className={`px-2 py-1 rounded text-xs ${placement === 'after' ? 'bg-white text-black' : 'text-white/50'}`}>AFTER</button>
                                </div>
                                <select 
                                    value={relativeSectorId}
                                    onChange={e => setRelativeSectorId(e.target.value)}
                                    className="flex-1 bg-transparent text-sm outline-none"
                                >
                                    {existingSectors.map(s => <option key={s.id} value={s.id} className="bg-black">{isWizard ? s.wizardName : s.muggleName}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* 3. Template */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase opacity-50">3. Template</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {templates.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => setFormData({...formData, uiTemplate: t.id})}
                                        className={`p-2 rounded border text-xs flex flex-col items-center gap-1 ${formData.uiTemplate === t.id ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <span className="text-lg">{t.icon}</span>
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: ICON PICKER */}
                    <div className="w-full md:w-1/2 flex flex-col bg-black/20">
                        <div className="p-4 border-b border-white/10">
                            <div className="flex gap-2 mb-4 bg-black/40 p-1 rounded-lg">
                                <button onClick={() => setActiveIconTab('wizard')} className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${activeIconTab === 'wizard' ? 'bg-emerald-600 text-white' : 'text-white/40 hover:text-white'}`}>
                                    WIZARD ICON: {formData.wizardIcon}
                                </button>
                                <button onClick={() => setActiveIconTab('muggle')} className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${activeIconTab === 'muggle' ? 'bg-fuchsia-600 text-white' : 'text-white/40 hover:text-white'}`}>
                                    MUGGLE ICON: {formData.muggleIcon}
                                </button>
                            </div>
                            
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-white/30" size={14} />
                                <input 
                                    value={iconSearch}
                                    onChange={e => setIconSearch(e.target.value)}
                                    placeholder="Search icons (e.g. book, flask...)"
                                    className="w-full pl-9 p-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-white/30"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-5 gap-2">
                                {filteredIcons.map(iconName => {
                                    // @ts-ignore
                                    const Icon = LucideIcons[iconName];
                                    const isSelected = activeIconTab === 'wizard' ? formData.wizardIcon === iconName : formData.muggleIcon === iconName;
                                    
                                    if (!Icon) return null;

                                    return (
                                        <button
                                            key={iconName}
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                [activeIconTab === 'wizard' ? 'wizardIcon' : 'muggleIcon']: iconName
                                            }))}
                                            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${isSelected ? (activeIconTab === 'wizard' ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'bg-fuchsia-600 text-white shadow-lg scale-105') : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                                            title={iconName}
                                        >
                                            <Icon size={20} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                            <button 
                                onClick={handleSave} 
                                disabled={!formData.wizardName || !formData.muggleName}
                                className={`w-full py-3 rounded-lg font-bold text-sm shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}
                            >
                                <Save size={18} /> CREATE SECTOR
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};