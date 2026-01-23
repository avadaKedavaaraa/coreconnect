import React, { useState, useEffect, useRef } from 'react';
import { Lineage, type UserProfile, SECTORS, GlobalConfig, FONT_LIBRARY } from '../types';
import { X, Clock, ClipboardList, User, Palette, Save, Type, PaintBucket, LayoutTemplate, Plus, Link as LinkIcon, Eye, Sun, Moon, Accessibility, Activity, RotateCw, Download, Search, CheckSquare, Square, Zap, Layers, MonitorPlay } from 'lucide-react';
import Pomodoro from './Pomodoro';
import Kanban from './Kanban';
import StudentID from './StudentID';

interface ToolsModalProps {
    lineage: Lineage;
    onClose: () => void;
    profile: UserProfile;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
    config?: GlobalConfig;
    onToggleLineage?: () => void;
}

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

// Helper to load a single font (for import feature)
const loadFontPreview = (fontName: string) => {
    const linkId = `font-preview-${fontName.replace(/\s+/g, '-')}`;
    if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
};

// --- FONT PANEL COMPONENT ---
interface FontPanelProps {
    isWizard: boolean;
    onClose: () => void;
    onSelect: (fontId: string) => void;
    currentFont?: string;
}

const FontPanel: React.FC<FontPanelProps> = ({ isWizard, onClose, onSelect, currentFont }) => {
    const [customFont, setCustomFont] = useState('');
    const [search, setSearch] = useState('');

    // Bulk load all fonts in the library so previews work immediately
    useEffect(() => {
        // Chunk fonts to avoid URL length limits (approx 20 per chunk)
        const chunkSize = 20;
        for (let i = 0; i < FONT_LIBRARY.length; i += chunkSize) {
            const chunk = FONT_LIBRARY.slice(i, i + chunkSize);
            const families = chunk
                .filter(f => !f.family.includes('sans-serif') && !f.family.includes('monospace') && !f.family.includes('serif')) // Skip generic system fonts if any
                .map(f => f.name.replace(/\s+/g, '+'))
                .join('&family=');

            if (families) {
                const href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
                if (!document.querySelector(`link[href="${href}"]`)) {
                    const link = document.createElement('link');
                    link.href = href;
                    link.rel = 'stylesheet';
                    document.head.appendChild(link);
                }
            }
        }
    }, []);

    const handleImport = () => {
        if (!customFont.trim()) return;

        let fontName = customFont.trim();
        // 1. Extract from Google Fonts Link Tag or URL
        if (fontName.includes('family=')) {
            const match = fontName.match(/family=([^&"':]+)/);
            if (match && match[1]) fontName = match[1].replace(/\+/g, ' ');
        }
        // 2. Extract from "specimen" URL
        else if (fontName.includes('/specimen/')) {
            const parts = fontName.split('/specimen/');
            if (parts[1]) fontName = parts[1].split('?')[0].replace(/\+/g, ' ');
        }
        // Clean up
        fontName = fontName.replace(/['"]/g, '').trim();

        loadFontPreview(fontName);
        onSelect(fontName);
        onClose();
    };

    const filteredFonts = FONT_LIBRARY.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-[fade-in_0.2s]">
            <div className={`w-full max-w-6xl h-[85vh] flex flex-col rounded-xl border shadow-2xl relative overflow-hidden
               ${isWizard ? 'bg-[#0a0f0a] border-emerald-600' : 'bg-[#0f0a15] border-fuchsia-600'}
            `}>
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center shrink-0 border-white/10">
                    <div className="flex items-center gap-3">
                        <Type size={24} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} />
                        <div>
                            <h3 className="text-xl font-bold text-white">Typography Archive</h3>
                            <p className="text-xs opacity-50 text-white">Select a typeface to rewrite reality.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white"><X size={24} /></button>
                </div>

                {/* Search & Custom Import Bar */}
                <div className="p-4 flex flex-col md:flex-row gap-4 border-b border-white/10 bg-white/5 shrink-0">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Filter by name or style (e.g. 'Serif', 'Tech')..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white outline-none placeholder:text-white/30 text-sm"
                        />
                    </div>
                    <div className="flex-[1.5] flex gap-2">
                        <input
                            value={customFont}
                            onChange={(e) => setCustomFont(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                            placeholder="Paste Google Fonts Link (e.g. 'Press Start 2P')"
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white outline-none placeholder:text-white/30 text-sm"
                        />
                        <button
                            onClick={handleImport}
                            className={`px-6 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors
                             ${isWizard ? 'bg-emerald-900 hover:bg-emerald-800' : 'bg-fuchsia-900 hover:bg-fuchsia-800'}
                          `}
                        >
                            <Download size={14} /> IMPORT
                        </button>
                    </div>
                </div>

                {/* Font Grid - SCROLLABLE AREA */}
                <div className={`flex-1 overflow-y-auto overscroll-contain p-6 min-h-0 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>

                    {/* Extended Library */}
                    <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4 text-white">
                        {search ? `Searching "${search}"` : "The Extended Collection"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredFonts.map(font => {
                            const isSelected = currentFont === font.id;
                            return (
                                <button
                                    key={font.id}
                                    onClick={() => { loadFontPreview(font.name); onSelect(font.id); onClose(); }}
                                    className={`p-4 rounded-lg border text-left flex flex-col gap-2 transition-all hover:scale-[1.02] relative group overflow-hidden h-28 justify-between
                                        ${isSelected
                                            ? (isWizard ? 'bg-emerald-900/40 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-fuchsia-900/40 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.2)]')
                                            : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'}
                                    `}
                                >
                                    <div className="flex justify-between items-center w-full relative z-10">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 ${isWizard ? 'bg-emerald-950/50 text-emerald-300' : 'bg-fuchsia-950/50 text-fuchsia-300'}`}>
                                            {font.category}
                                        </span>
                                        {isSelected && <CheckCircleIcon isWizard={isWizard} />}
                                    </div>

                                    <div className="relative z-10 w-full">
                                        <div className="text-xl truncate leading-none mb-1 w-full" style={{ fontFamily: font.family }}>
                                            {font.name}
                                        </div>
                                        <div className="text-[10px] opacity-50 truncate w-full" style={{ fontFamily: font.family }}>
                                            The quick brown fox jumps over the lazy dog.
                                        </div>
                                    </div>

                                    {/* Hover Preview Load Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
                                </button>
                            );
                        })}
                    </div>
                    {filteredFonts.length === 0 && (
                        <div className="p-8 text-center opacity-50 italic">
                            No fonts found matching your spell.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CheckCircleIcon = ({ isWizard }: { isWizard: boolean }) => (
    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isWizard ? 'bg-emerald-500 text-black' : 'bg-fuchsia-500 text-black'}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    </div>
);

const ToolsModal: React.FC<ToolsModalProps> = ({ lineage, onClose, profile, setProfile, config, onToggleLineage }) => {
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
            editProfile.themeGradient !== profile.themeGradient || // Check gradient change
            editProfile.highContrast !== profile.highContrast ||
            editProfile.brightness !== profile.brightness ||
            editProfile.contrast !== profile.contrast ||
            editProfile.skipIntro !== profile.skipIntro; // <-- ADDED: Check skipIntro change
        setHasChanges(isDifferent);
    }, [editProfile, profile]);

    const handleSaveProfile = () => {
        setProfile(prev => ({
            ...prev,
            displayName: editProfile.displayName,
            preferredFont: editProfile.preferredFont,
            themeColor: editProfile.themeColor,
            themeGradient: editProfile.themeGradient,
            highContrast: editProfile.highContrast,
            brightness: editProfile.brightness,
            contrast: editProfile.contrast,
            skipIntro: editProfile.skipIntro // <-- ADDED: Save skipIntro
        }));

        // Update localStorage immediately so next reload works even if they don't navigate
        const saved = localStorage.getItem('core_connect_profile');
        if (saved) {
            const p = JSON.parse(saved);
            localStorage.setItem('core_connect_profile', JSON.stringify({ ...p, skipIntro: editProfile.skipIntro }));
        }

        setHasChanges(false);
        const btn = document.getElementById('save-btn');
        if (btn) {
            const originalText = btn.innerText;
            btn.innerText = "SAVED!";
            setTimeout(() => btn.innerText = originalText, 2000);
        }
    };

    return (
        <>
            {showFontPanel && (
                <FontPanel
                    isWizard={isWizard}
                    onClose={() => setShowFontPanel(false)}
                    onSelect={(fontId) => setEditProfile({ ...editProfile, preferredFont: fontId as any })}
                    currentFont={editProfile.preferredFont}
                />
            )}

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

                                    {/* Lineage Toggle (Mobile Only feature moved here) */}
                                    {onToggleLineage && (
                                        <button
                                            onClick={onToggleLineage}
                                            className={`w-full py-4 rounded-lg border font-bold flex items-center justify-center gap-3 transition-all
                                ${isWizard
                                                    ? 'bg-emerald-900/30 border-emerald-500 text-emerald-100'
                                                    : 'bg-fuchsia-900/30 border-fuchsia-500 text-fuchsia-100'}
                             `}
                                        >
                                            <RotateCw size={20} className={isWizard ? 'animate-spin-slow' : ''} />
                                            SWITCH REALITY ({isWizard ? 'Muggle' : 'Wizard'})
                                        </button>
                                    )}

                                    {/* Display Name */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-white">
                                            <User size={16} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} /> Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={editProfile.displayName}
                                            onChange={(e) => setEditProfile({ ...editProfile, displayName: e.target.value })}
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
                                                onClick={() => setEditProfile(prev => ({ ...prev, highContrast: !prev.highContrast }))}
                                                className={`w-12 h-6 rounded-full p-1 transition-colors relative ${editProfile.highContrast ? (isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500') : 'bg-zinc-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${editProfile.highContrast ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                            </button>
                                        </div>

                                        {/* --- STARTUP TOGGLE (NEW) --- */}
                                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                            <div>
                                                <label className="text-sm font-bold text-white flex items-center gap-2">
                                                    <Zap size={14} className={editProfile.skipIntro ? "text-yellow-400" : ""} />
                                                    Skip Intro & Gate
                                                </label>
                                                <p className="text-xs opacity-60 text-white/70">Bypass loading screen.</p>
                                            </div>
                                            <button
                                                onClick={() => setEditProfile(prev => ({ ...prev, skipIntro: !prev.skipIntro }))}
                                                className={`w-12 h-6 rounded-full p-1 transition-colors relative ${editProfile.skipIntro ? (isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500') : 'bg-zinc-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${editProfile.skipIntro ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                            </button>
                                        </div>
                                        {/* --- END STARTUP TOGGLE --- */}

                                        <div>
                                            <div className="flex justify-between text-xs mb-1 opacity-80 text-white">
                                                <span>Global Brightness</span>
                                                <span>{editProfile.brightness || 100}%</span>
                                            </div>
                                            <input
                                                type="range" min="50" max="150" step="5"
                                                value={editProfile.brightness || 100}
                                                onChange={(e) => setEditProfile({ ...editProfile, brightness: Number(e.target.value) })}
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
                                                onChange={(e) => setEditProfile({ ...editProfile, contrast: Number(e.target.value) })}
                                                className="w-full accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* Fonts */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-white">
                                            <Type size={16} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} /> Interface Font
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
                                            <Plus size={16} /> EXPLORE 60+ FONTS
                                        </button>
                                    </div>

                                    {/* Themes */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 text-sm font-bold text-white">
                                                <PaintBucket size={16} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} /> Soul Color
                                            </label>

                                            {/* NEON GRADIENT CHECKBOX */}
                                            <label className="flex items-center gap-2 cursor-pointer group select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={!!editProfile.themeGradient}
                                                    onChange={(e) => setEditProfile(prev => ({ ...prev, themeGradient: e.target.checked }))}
                                                    className={`w-4 h-4 rounded border appearance-none transition-colors relative
                                        ${editProfile.themeGradient
                                                            ? (isWizard ? 'bg-emerald-500 border-emerald-500' : 'bg-fuchsia-500 border-fuchsia-500')
                                                            : 'bg-transparent border-white/50 group-hover:border-white'}
                                     `}
                                                />
                                                {/* Custom Checkmark */}
                                                {editProfile.themeGradient && <CheckSquare size={14} className="absolute text-black pointer-events-none" style={{ marginLeft: 1 }} />}

                                                <span className={`text-xs font-bold transition-colors ${editProfile.themeGradient ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>
                                                    Neon Gradient
                                                </span>
                                            </label>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            {themeColors.map(color => (
                                                <button
                                                    key={color.id}
                                                    onClick={() => setEditProfile({ ...editProfile, themeColor: color.id })}
                                                    title={color.name}
                                                    className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center overflow-hidden
                                        ${editProfile.themeColor === color.id ? 'border-white scale-110 shadow-lg' : 'border-transparent'}
                                     `}
                                                    style={{ backgroundColor: color.id || 'transparent', border: !color.id ? '1px dashed grey' : undefined }}
                                                >
                                                    {!color.id && <span className="text-[8px] uppercase text-white font-bold opacity-70">Def</span>}
                                                </button>
                                            ))}

                                            {/* Custom Color Input */}
                                            <label className={`w-10 h-10 rounded-full border-2 flex items-center justify-center cursor-pointer relative overflow-hidden transition-transform hover:scale-110
                                   ${editProfile.themeColor && !themeColors.some(c => c.id === editProfile.themeColor) ? 'border-white shadow-lg scale-110' : 'border-white/30 border-dashed'}
                               `}>
                                                <input
                                                    type="color"
                                                    className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] cursor-pointer opacity-0"
                                                    value={editProfile.themeColor || '#ffffff'}
                                                    onChange={(e) => setEditProfile({ ...editProfile, themeColor: e.target.value })}
                                                />
                                                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: editProfile.themeColor || 'transparent' }}></div>
                                                {!editProfile.themeColor && <Plus size={14} className="text-white/50" />}
                                            </label>
                                        </div>
                                    </div>
                                    {/* --- NEW SECTION: VIDEO PLAYER PREFERENCE --- */}
                                    <div className="space-y-3 pt-4 border-t border-white/10">
                                        <h4 className="text-xs font-bold opacity-50 uppercase tracking-widest">
                                            Video Player Experience
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    localStorage.setItem('core_video_mode', 'smart');
                                                    // Force a small reload or state update if needed, but usually not required for next click
                                                    alert("Smart Player Activated: You will now see the advanced control dock!");
                                                }}
                                                className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex flex-col items-center gap-2 transition-all active:scale-95"
                                            >
                                                <div className={`p-2 rounded-full ${isWizard ? 'bg-emerald-500/20 text-emerald-300' : 'bg-fuchsia-500/20 text-fuchsia-300'}`}>
                                                    <Layers size={20} />
                                                </div>
                                                <span className="text-xs font-bold">Smart Player</span>
                                                <span className="text-[10px] opacity-50 text-center">Interactive Dock & Controls</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    localStorage.setItem('core_video_mode', 'normal');
                                                    alert("Classic Player Activated: Videos will open in the standard popup.");
                                                }}
                                                className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex flex-col items-center gap-2 transition-all active:scale-95"
                                            >
                                                <div className="p-2 rounded-full bg-white/10 text-white">
                                                    <MonitorPlay size={20} />
                                                </div>
                                                <span className="text-xs font-bold">Normal Player</span>
                                                <span className="text-[10px] opacity-50 text-center">Faster, Simple Popup</span>
                                            </button>
                                        </div>
                                    </div>
                                    {/* --- NEW SECTION: VIDEO PLAYER PREFERENCE --- */}
                       <div className="space-y-3 pt-4 border-t border-white/10">
                           <h4 className="text-xs font-bold opacity-50 uppercase tracking-widest text-white">
                               Video Player Experience
                           </h4>
                           <div className="grid grid-cols-2 gap-3">
                               <button
                                   onClick={() => {
                                       localStorage.setItem('core_video_mode', 'smart');
                                       alert("Smart Player Activated: You will now see the advanced control dock!");
                                   }}
                                   className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex flex-col items-center gap-2 transition-all active:scale-95 text-white"
                               >
                                   <div className={`p-2 rounded-full ${isWizard ? 'bg-emerald-500/20 text-emerald-300' : 'bg-fuchsia-500/20 text-fuchsia-300'}`}>
                                       <Layers size={20} />
                                   </div>
                                   <span className="text-xs font-bold">Smart Player</span>
                                   <span className="text-[10px] opacity-50 text-center">Interactive Dock & Controls</span>
                               </button>

                               <button
                                   onClick={() => {
                                       localStorage.setItem('core_video_mode', 'normal');
                                       alert("Classic Player Activated: Videos will open in the standard popup.");
                                   }}
                                   className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex flex-col items-center gap-2 transition-all active:scale-95 text-white"
                               >
                                   <div className="p-2 rounded-full bg-white/10 text-white">
                                       <MonitorPlay size={20} />
                                   </div>
                                   <span className="text-xs font-bold">Normal Player</span>
                                   <span className="text-[10px] opacity-50 text-center">Faster, Simple Popup</span>
                               </button>
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