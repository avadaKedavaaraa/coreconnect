import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Lineage, type CarouselItem, type LectureRule, GlobalConfig, Sector } from '../types';
import { Book, FileText, Video, Calendar, Search, Filter, X, Trash2, LayoutGrid, List, FolderOpen, ArrowLeft, Edit2, Plus, FolderPlus, Loader2, Image as ImageIcon, Send, Link as LinkIcon, Repeat, ExternalLink, Hourglass, MonitorOff, Bell, Layers, Code, Pin, PinOff, SortAsc, SortDesc, GripVertical, Save, Check, CalendarDays, Clock, Users } from 'lucide-react';
import CalendarWidget from './CalendarWidget';
import DOMPurify from 'dompurify';
import { trackActivity } from '../services/tracking';

interface SectorViewProps {
    items: CarouselItem[];
    allItems?: CarouselItem[];
    lineage: Lineage;
    sectorId: string;
    onViewItem: (item: CarouselItem) => void;
    isAdmin?: boolean;
    onDelete?: (id: string) => void;
    onEdit?: (item: CarouselItem) => void;
    onUpdateItem?: (item: CarouselItem) => Promise<void>;
    onBack?: () => void;
    onAddItem?: (sectorId: string) => void;
    onQuickCreate?: (item: CarouselItem) => void;
    onUpdateSubject?: (oldName: string, newName: string, newImage?: string) => Promise<void>;
    onReorder?: (updates: { id: string, order_index: number }[]) => Promise<void>;
    schedules?: LectureRule[];
    quickInputOnly?: boolean;
    config?: GlobalConfig;
    sectors?: Sector[];
}

const ACADEMIC_SECTORS = ['books', 'notes', 'resources', 'tasks'];

export const SectorView: React.FC<SectorViewProps> = ({
    items, allItems, lineage, sectorId, onViewItem, isAdmin, onDelete, onEdit, onUpdateItem, onBack, onAddItem, onQuickCreate, onUpdateSubject, onReorder, schedules, quickInputOnly, config, sectors
}) => {
    const isWizard = lineage === Lineage.WIZARD;
    const isLectures = sectorId === 'lectures';

    // TRACKING
    useEffect(() => {
        try {
            const profile = JSON.parse(localStorage.getItem('core_connect_profile') || '{}');
            if (profile.id && !quickInputOnly) {
                trackActivity(profile.id, 'ENTER_SECTOR', sectorId, sectorId, 0);
            }
        } catch (e) { }
    }, [sectorId, quickInputOnly]);

    // --- STATE ---
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [viewMode, setViewMode] = useState<'folders' | 'masonry' | 'list'>('folders');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [showPinnedOnly, setShowPinnedOnly] = useState(false);

    // Lecture Specific State
    const [activeBatch, setActiveBatch] = useState<'AICS' | 'CSDA'>('AICS');
    const [showFullTimetable, setShowFullTimetable] = useState(false);

    const [draggedItem, setDraggedItem] = useState<CarouselItem | null>(null);
    const [localDisplayItems, setLocalDisplayItems] = useState<CarouselItem[]>([]);
    const [isOrderChanged, setIsOrderChanged] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: CarouselItem } | null>(null);
    const [quickPostText, setQuickPostText] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    const [isCreatingSubject, setIsCreatingSubject] = useState(false);
    const [editingSubject, setEditingSubject] = useState<{ originalName: string, name: string, image: string } | null>(null);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectImage, setNewSubjectImage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- DERIVED DATA ---
    const subjects = useMemo(() => Array.from(new Set(items.map(i => i.subject || 'General'))).sort(), [items]);
    const currentSector = sectors?.find(s => s.id === sectorId);
    const activeSortOrder = currentSector?.sortOrder || 'newest';
    const isManualSort = activeSortOrder === 'manual';

    // --- DATA PROCESSING ---
    useEffect(() => {
        let combined = [...items];

        // Sort
        combined.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

            if (activeSortOrder === 'manual') {
                const orderA = a.order_index ?? 0;
                const orderB = b.order_index ?? 0;
                if (orderA !== orderB) return orderA - orderB;
            }

            if (activeSortOrder === 'alphabetical') {
                return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
            }

            const dateA = a.date.replace(/\./g, '-');
            const dateB = b.date.replace(/\./g, '-');
            if (dateA !== dateB) {
                const timeA = new Date(dateA).getTime() || 0;
                const timeB = new Date(dateB).getTime() || 0;
                return activeSortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
            }
            return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
        });

        setLocalDisplayItems(combined);
        setIsOrderChanged(false);
    }, [items, sectorId, activeSortOrder]);

    const filteredItems = useMemo(() => {
        return localDisplayItems.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                item.content.toLowerCase().includes(search.toLowerCase());
            const normalizedItemDate = item.date.replace(/-/g, '.');
            const normalizedFilter = dateFilter.replace(/-/g, '.');

            const matchesDate = dateFilter ? normalizedItemDate === normalizedFilter : true;
            const matchesSubject = subjectFilter ? (item.subject || 'General') === subjectFilter : true;
            const matchesPinned = showPinnedOnly ? item.isPinned : true;

            return matchesSearch && matchesDate && matchesSubject && matchesPinned;
        });
    }, [localDisplayItems, search, dateFilter, subjectFilter, showPinnedOnly]);

    // --- LECTURE SCHEDULE LOGIC ---
    const todaysLectures = useMemo(() => {
        if (!schedules || !isLectures) return [];
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return schedules.filter(s =>
            s.isActive &&
            s.dayOfWeek === today &&
            (s.batch === activeBatch || !s.batch) // Backwards compatibility for old data
        ).sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [schedules, isLectures, activeBatch]);

    const weeklySchedule = useMemo(() => {
        if (!schedules || !isLectures) return {};
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const grouped: Record<string, LectureRule[]> = {};
        days.forEach(day => {
            grouped[day] = schedules.filter(s =>
                s.isActive &&
                s.dayOfWeek === day &&
                (s.batch === activeBatch || !s.batch)
            ).sort((a, b) => a.startTime.localeCompare(b.startTime));
        });
        return grouped;
    }, [schedules, isLectures, activeBatch]);

    // --- DRAG & DROP HANDLERS ---
    const handleDragStart = (e: React.DragEvent, item: CarouselItem) => {
        if (!isAdmin || !isManualSort) return;
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
    };
    const handleDragOver = (e: React.DragEvent, targetItem: CarouselItem) => {
        if (!isAdmin || !isManualSort || !draggedItem || draggedItem.id === targetItem.id) return;
        e.preventDefault();
    };
    const handleDrop = (e: React.DragEvent, targetItem: CarouselItem) => {
        if (!isAdmin || !isManualSort || !draggedItem || draggedItem.id === targetItem.id) return;
        e.preventDefault();
        const currentIndex = localDisplayItems.findIndex(i => i.id === draggedItem.id);
        const targetIndex = localDisplayItems.findIndex(i => i.id === targetItem.id);
        if (currentIndex === -1 || targetIndex === -1) return;
        const newItems = [...localDisplayItems];
        const [removed] = newItems.splice(currentIndex, 1);
        newItems.splice(targetIndex, 0, removed);
        setLocalDisplayItems(newItems);
        setIsOrderChanged(true);
        setDraggedItem(null);
    };
    const handleSaveOrder = async () => {
        if (!onReorder) return;
        setIsSavingOrder(true);
        try {
            const updates = localDisplayItems.map((item, index) => ({ id: item.id, order_index: index }));
            await onReorder(updates);
            setIsOrderChanged(false);
        } catch (e) { alert("Failed to save order."); } finally { setIsSavingOrder(false); }
    };

    // --- UI HANDLERS ---
    useEffect(() => {
        if ((search || dateFilter) && viewMode === 'folders') { setViewMode('masonry'); }
    }, [search, dateFilter, viewMode]);

    useEffect(() => {
        setSearch(''); setDateFilter(''); setSubjectFilter(''); setShowPinnedOnly(false);
        setViewMode(isLectures ? 'list' : 'folders');
    }, [sectorId, isLectures]);

    // --- QUICK ACTIONS ---
    const handleQuickPost = async () => {
        if (!quickPostText.trim() || !onQuickCreate) return;
        setIsPosting(true);
        try {
            await onQuickCreate({
                id: crypto.randomUUID(),
                title: quickPostText.substring(0, 30) + (quickPostText.length > 30 ? '...' : ''),
                content: quickPostText,
                date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
                type: 'announcement', sector: sectorId, subject: subjectFilter || 'General', author: 'Admin', isUnread: true, isPinned: false, likes: 0, style: {}
            });
            setQuickPostText('');
        } catch (e) { alert('Failed to post'); } finally { setIsPosting(false); }
    };

    const handleCreateSubject = async () => {
        if (!newSubjectName.trim() || !onQuickCreate) return;
        setIsProcessing(true);
        const subjectName = newSubjectName.trim();
        let targetSectors = [sectorId];
        if (ACADEMIC_SECTORS.includes(sectorId)) targetSectors = ACADEMIC_SECTORS;
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');

        try {
            for (const targetSector of targetSectors) {
                const sourceList = allItems || items;
                const subjectExists = sourceList.some(item => item.sector === targetSector && (item.subject || '').trim().toLowerCase() === subjectName.toLowerCase());
                if (!subjectExists) {
                    await onQuickCreate({
                        id: crypto.randomUUID(), title: `Welcome to ${subjectName}`, content: `This folder has been created for ${subjectName} resources.`,
                        date: today, type: 'announcement', sector: targetSector, subject: subjectName, image: newSubjectImage || undefined,
                        author: 'System', isUnread: true, likes: 0, style: { titleColor: isWizard ? '#10b981' : '#d946ef', contentColor: '#ffffff', fontFamily: 'sans', isGradient: false }
                    });
                }
            }
            setNewSubjectName(''); setNewSubjectImage(''); setIsCreatingSubject(false);
        } catch (e) { alert("Failed to create subject."); } finally { setIsProcessing(false); }
    };

    const handleTogglePin = async (e: React.MouseEvent, item: CarouselItem) => {
        e.stopPropagation();
        if (onUpdateItem) { await onUpdateItem({ ...item, isPinned: !item.isPinned }); } else if (onEdit) { onEdit({ ...item, isPinned: !item.isPinned }); }
    };

    const handleContextMenu = (e: React.MouseEvent, item: CarouselItem) => {
        if (!isAdmin) return;
        e.preventDefault(); e.stopPropagation();
        let x = e.clientX; let y = e.clientY;
        if (window.innerWidth - x < 160) x -= 160;
        if (window.innerHeight - y < 150) y -= 150;
        setContextMenu({ x, y, item });
    };

    const getTypeIcon = (type: string) => {
        switch (type) { case 'video': return <Video size={20} />; case 'file': return <FileText size={20} />; case 'mixed': return <Layers size={20} />; case 'code': return <Code size={20} />; case 'link': return <LinkIcon size={20} />; default: return <FileText size={20} />; }
    };

    // --- RENDER HELPERS ---
    // --- STRANGER THINGS THEMED TIMETABLE ---
    const renderTimetable = () => (
        <div className="mb-10 animate-[fade-in_0.5s]">
            {/* Header */}
            <div className={`relative p-6 rounded-t-xl border-t border-x overflow-hidden flex justify-between items-end
              ${isWizard
                    ? 'bg-[#050a05] border-emerald-900/50'
                    : 'bg-[#0a050a] border-red-900/50 shadow-[0_0_30px_rgba(220,38,38,0.1)]'}
          `}>
                {/* Retro Grid Background */}
                <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>

                <div>
                    <h3 className={`text-3xl md:text-5xl font-black uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]
                        ${isWizard ? 'font-serif text-emerald-500' : 'font-serif text-red-600'}
                        stranger-things-title
                   `}>
                        {activeBatch}
                    </h3>
                    <div className="text-xs font-mono tracking-[0.3em] opacity-60 uppercase mt-1 pl-1">
                        Weekly Course Schedule
                    </div>
                </div>

                <button onClick={() => setShowFullTimetable(!showFullTimetable)} className={`relative z-10 px-4 py-1 text-[10px] font-bold uppercase tracking-widest border transition-all hover:bg-white/5 ${isWizard ? 'border-emerald-800 text-emerald-400' : 'border-red-800 text-red-500'}`}>
                    {showFullTimetable ? 'Collapse Timeline' : 'Expand Full Week'}
                </button>
            </div>

            {/* FULL WEEK VIEW */}
            {(showFullTimetable || todaysLectures.length === 0) && (
                <div className={`p-4 border-x border-b rounded-b-xl overflow-x-auto ${isWizard ? 'bg-[#0a0f0a]/90 border-emerald-900/30' : 'bg-[#0f0a0f]/90 border-red-900/30'}`}>
                    <div className="flex gap-4 min-w-max pb-4">
                        {Object.entries(weeklySchedule).map(([day, classes]) => (
                            <div key={day} className={`w-64 shrink-0 rounded-lg border bg-black/40 flex flex-col ${isWizard ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                                <div className={`p-2 text-center text-xs font-bold uppercase border-b tracking-widest ${isWizard ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20' : 'bg-red-900/20 text-red-500 border-red-500/20'}`}>{day}</div>
                                <div className="p-3 space-y-3 flex-1 min-h-[100px]">
                                    {classes.length > 0 ? classes.map(cls => (
                                        <div key={cls.id} className="relative group p-3 rounded border border-white/5 bg-gradient-to-br from-white/5 to-transparent hover:border-white/20 transition-all overflow-hidden">
                                            {/* Image Background (Subtle) */}
                                            {cls.image && (
                                                <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity bg-cover bg-center" style={{ backgroundImage: `url(${cls.image})` }}></div>
                                            )}
                                            <div className="relative z-10">
                                                <div className="font-bold text-sm text-zinc-200 leading-tight mb-1">{cls.subject}</div>
                                                <div className="flex justify-between items-end">
                                                    <div className="text-[10px] font-mono opacity-50">{cls.startTime}</div>
                                                    {cls.link && <span className={`text-[10px] font-bold ${isWizard ? 'text-emerald-500' : 'text-red-500'}`}>JOIN &rarr;</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )) : <div className="h-full flex items-center justify-center opacity-20 text-[10px] uppercase font-mono tracking-widest">No Signals</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ACTIVE LECTURES (TODAY) - STRANGER THINGS CARDS */}
            {!showFullTimetable && todaysLectures.length > 0 && (
                <div className={`p-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-x border-b rounded-b-xl ${isWizard ? 'bg-[#0a0f0a] border-emerald-900/30' : 'bg-[#050005] border-red-900/30'}`}>
                    {todaysLectures.map(cls => (
                        <div key={cls.id} className="group relative h-64 rounded-xl overflow-hidden border-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] border-transparent hover:border-red-600/50">

                            {/* 1. BACKGROUND IMAGE */}
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                                style={{
                                    backgroundImage: `url(${cls.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop'})`,
                                    filter: 'grayscale(40%) contrast(120%) brightness(60%)'
                                }}
                            ></div>

                            {/* 2. OVERLAY GRADIENT (Upside Down Vibe) */}
                            <div className={`absolute inset-0 bg-gradient-to-t ${isWizard ? 'from-emerald-950/90 via-emerald-950/40 to-transparent' : 'from-red-950/90 via-black/50 to-transparent'}`}></div>

                            {/* 3. SCANLINES & NOISE */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 3px)' }}></div>

                            {/* 4. CONTENT */}
                            <div className="absolute inset-0 p-6 flex flex-col justify-between z-20">

                                {/* Top Bar */}
                                <div className="flex justify-between items-start">
                                    <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md shadow-[0_0_10px_black]
                                    ${cls.batch === 'CSDA'
                                            ? 'bg-purple-900/80 border-purple-500 text-purple-100'
                                            : 'bg-blue-900/80 border-blue-500 text-blue-100'}
                                 `}>
                                        BATCH: {cls.batch}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                                        <span className="text-xs font-mono text-red-400 font-bold tracking-widest">LIVE</span>
                                    </div>
                                </div>

                                {/* Bottom Info */}
                                <div>
                                    {/* Custom Message "Sticky Note" */}
                                    {cls.customMessage && (
                                        <div className="mb-3 inline-block transform -rotate-1 origin-bottom-left">
                                            <span className="bg-[#fff1a8] text-black text-[10px] font-bold px-2 py-1 shadow-lg font-mono leading-none">
                                                {cls.customMessage}
                                            </span>
                                        </div>
                                    )}

                                    <h2 className={`text-3xl font-black uppercase leading-none mb-1 drop-shadow-md ${isWizard ? 'font-serif text-emerald-100' : 'font-serif text-white'}`} style={{ textShadow: '2px 2px 0px #000' }}>
                                        {cls.subject}
                                    </h2>

                                    <div className="flex justify-between items-end mt-4">
                                        <div className="text-sm font-mono opacity-80 flex items-center gap-2">
                                            <Clock size={14} className="text-red-500" />
                                            <span className="bg-black/50 px-1 rounded text-red-100 border border-red-500/30">{cls.startTime}</span>
                                        </div>

                                        {cls.link && (
                                            <a
                                                href={cls.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={`
                                                px-6 py-2 font-bold text-xs uppercase tracking-widest transition-all 
                                                border-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)]
                                                ${isWizard
                                                        ? 'bg-emerald-800 border-emerald-400 text-white hover:bg-emerald-700'
                                                        : 'bg-red-700 border-red-500 text-white hover:bg-red-600'}
                                            `}
                                            >
                                                Enter Portal
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // --- COMPONENT RETURN ---
    if (quickInputOnly) {
        return (
            <div className={`relative flex items-center p-2 rounded-lg border backdrop-blur-sm transition-all ${isWizard ? 'bg-emerald-950/40 border-emerald-500/30 focus-within:border-emerald-400' : 'bg-fuchsia-950/40 border-fuchsia-500/30 focus-within:border-fuchsia-400'}`}>
                <input type="text" value={quickPostText} onChange={(e) => setQuickPostText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuickPost()} placeholder="Lazy Post: Type message & press Enter..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30 px-2" disabled={isPosting} />
                <button onClick={handleQuickPost} disabled={!quickPostText.trim() || isPosting} className={`p-2 rounded-full transition-colors ${isWizard ? 'text-emerald-400 hover:bg-emerald-900/50' : 'text-fuchsia-400 hover:bg-fuchsia-900/50'}`}>{isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
            </div>
        );
    }

    return (
        <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 pb-20 animate-[fade-in-up_0.3s_ease-out] ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>

            {/* Context Menu & Modals */}
            {contextMenu && isAdmin && (
                <div className={`fixed z-[100] min-w-[160px] rounded-lg border shadow-xl overflow-hidden py-1 animate-[fade-in_0.1s] ${isWizard ? 'bg-[#0a0f0a] border-emerald-500/50 shadow-emerald-900/50' : 'bg-[#0f0a15] border-fuchsia-500/50 shadow-fuchsia-900/50'}`} style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { handleTogglePin(e, contextMenu.item); setContextMenu(null); }} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>{contextMenu.item.isPinned ? <PinOff size={14} /> : <Pin size={14} />} {contextMenu.item.isPinned ? "Unpin" : "Pin to Top"}</button>
                    {onEdit && <button onClick={(e) => { onEdit(contextMenu.item); setContextMenu(null); }} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}><Edit2 size={14} /> Edit</button>}
                    {onDelete && <button onClick={(e) => { if (confirm('Delete this item?')) onDelete(contextMenu.item.id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-900/30 text-red-400"><Trash2 size={14} /> Delete</button>}
                </div>
            )}
            {editingSubject && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-md p-6 rounded-xl border shadow-2xl space-y-4 ${isWizard ? 'bg-[#0a0f0a] border-emerald-600' : 'bg-[#0f0a15] border-fuchsia-600'}`}>
                        <h3 className={`text-xl font-bold ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>Edit Subject</h3>
                        <input value={editingSubject.name || ''} onChange={(e) => setEditingSubject(prev => prev ? { ...prev, name: e.target.value } : null)} placeholder="Subject Name" className={`w-full p-3 rounded border bg-black/40 outline-none ${isWizard ? 'border-emerald-800 text-emerald-100' : 'border-fuchsia-800 text-fuchsia-100'}`} autoFocus />
                        <input value={editingSubject.image || ''} onChange={(e) => setEditingSubject(prev => prev ? { ...prev, image: e.target.value } : null)} placeholder="Cover Image URL" className={`w-full p-3 rounded border bg-black/40 outline-none ${isWizard ? 'border-emerald-800 text-emerald-100' : 'border-fuchsia-800 text-fuchsia-100'}`} />
                        {editingSubject.image && <img src={editingSubject.image} className="w-full h-32 object-cover rounded border border-white/10" />}
                        <div className="flex gap-2 justify-end"><button onClick={() => setEditingSubject(null)} className="px-4 py-2 rounded text-white/50 hover:text-white">Cancel</button><button onClick={() => { }} disabled={isProcessing} className={`px-6 py-2 rounded font-bold flex items-center gap-2 ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}>{isProcessing ? <Loader2 className="animate-spin" /> : <Check size={18} />} Save Changes</button></div>
                    </div>
                </div>
            )}

            {/* Header Controls */}
            <div className="flex items-center gap-4 mb-4 justify-between">
                <div className="flex items-center gap-4">
                    {onBack && <button onClick={onBack} className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 border-transparent ${isWizard ? 'text-emerald-400 hover:text-emerald-200 hover:border-emerald-500' : 'text-fuchsia-400 hover:text-fuchsia-200 hover:border-fuchsia-500'}`}><ArrowLeft size={16} /> Exit Sector</button>}
                    {!onBack && subjectFilter && viewMode !== 'folders' && !isLectures && <button onClick={() => { setSubjectFilter(''); setViewMode('folders'); }} className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 border-transparent ${isWizard ? 'text-emerald-400 hover:text-emerald-200 hover:border-emerald-500' : 'text-fuchsia-400 hover:text-fuchsia-200 hover:border-fuchsia-500'}`}><FolderOpen size={16} /> Back to Folders</button>}
                </div>
                <div className="flex items-center gap-3">{onAddItem && <button onClick={() => onAddItem(sectorId)} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all hover:scale-105 active:scale-95 ${isWizard ? 'bg-emerald-600 text-black hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-fuchsia-600 text-black hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.3)]'}`}><Plus size={18} /> <span className="hidden sm:inline">Add Content</span></button>}</div>
            </div>

            {!onBack && !isLectures && subjectFilter && <div className="mb-6 text-center animate-[fade-in_0.5s]"><h2 className={`text-4xl font-bold tracking-widest uppercase drop-shadow-[0_0_10px_currentColor] ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>{subjectFilter}</h2><div className={`h-1 w-24 mx-auto mt-2 rounded-full ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div></div>}

            {/* FILTER BAR & LECTURE BATCH SELECTOR */}
            <div className={`mb-8 p-4 rounded-xl border backdrop-blur-md flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between sticky top-2 sm:top-4 z-40 shadow-2xl transition-all mx-2 sm:mx-0 ${isWizard ? 'bg-emerald-950/80 border-emerald-500/50 shadow-black/50' : 'bg-fuchsia-950/80 border-fuchsia-500/50 shadow-black/50'}`}>

                {isLectures ? (
                    <div className="w-full flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <span className={`text-sm font-bold uppercase tracking-widest opacity-70 ${isWizard ? 'text-emerald-200' : 'text-fuchsia-200'}`}>Select Batch:</span>
                            <div className="flex bg-black/40 rounded p-1 border border-white/10">
                                <button onClick={() => setActiveBatch('AICS')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeBatch === 'AICS' ? (isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black') : 'text-white/50 hover:text-white'}`}>AICS</button>
                                <button onClick={() => setActiveBatch('CSDA')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeBatch === 'CSDA' ? (isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black') : 'text-white/50 hover:text-white'}`}>CSDA</button>
                            </div>
                        </div>
                        {/* Standard Filter Button for Lecture History */}
                        <div className="flex gap-2">
                            <div className="relative z-[40]"><CalendarWidget lineage={lineage} items={localDisplayItems} selectedDate={dateFilter} onSelectDate={setDateFilter} isOpen={calendarOpen} setIsOpen={setCalendarOpen} /></div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto flex-1">
                            <div className="relative flex-[2] min-w-[200px]"><Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} pointer-events-none`} /><input type="text" placeholder={isWizard ? "Search the archives..." : "Filter database..."} value={search} onChange={(e) => setSearch(e.target.value)} className={`w-full pl-10 pr-4 py-2 rounded border bg-black/40 outline-none transition-all text-base ${isWizard ? 'border-emerald-700 text-emerald-100 placeholder:text-emerald-700/50 focus:border-emerald-400 font-wizard' : 'border-fuchsia-700 text-fuchsia-100 placeholder:text-fuchsia-700/50 focus:border-fuchsia-400 font-muggle'}`} /></div>
                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0"><div className="relative z-[40]"><CalendarWidget lineage={lineage} items={localDisplayItems} selectedDate={dateFilter} onSelectDate={setDateFilter} isOpen={calendarOpen} setIsOpen={setCalendarOpen} /></div><button onClick={() => setShowPinnedOnly(!showPinnedOnly)} className={`flex items-center gap-2 px-4 py-2 rounded border transition-all hover:bg-white/5 whitespace-nowrap ${showPinnedOnly ? (isWizard ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300' : 'bg-fuchsia-900/40 border-fuchsia-500 text-fuchsia-300') : (isWizard ? 'border-emerald-700 text-emerald-100' : 'border-fuchsia-700 text-fuchsia-100')}`} title="Show Pinned Messages Only"><Pin size={16} fill={showPinnedOnly ? "currentColor" : "none"} /><span className={isWizard ? 'font-wizard' : 'font-muggle text-xs'}>{showPinnedOnly ? "Pinned" : "All"}</span></button>{!isLectures && (<div className="relative min-w-[140px]"><select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); if (e.target.value && viewMode === 'folders') setViewMode('masonry'); }} className={`w-full px-4 py-2 rounded border bg-transparent outline-none appearance-none cursor-pointer text-base h-full ${isWizard ? 'border-emerald-700 text-emerald-100 bg-[#050a05] font-wizard' : 'border-fuchsia-700 text-fuchsia-100 bg-[#09050f] font-muggle'}`}><option value="" className="bg-black">{isWizard ? "All Subjects" : "All Directories"}</option>{subjects.map(sub => <option key={sub} value={sub} className="bg-black text-white">{sub}</option>)}</select><Filter className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50`} /></div>)}</div>
                            {isAdmin && isManualSort && isOrderChanged && <button onClick={handleSaveOrder} disabled={isSavingOrder} className={`flex items-center gap-2 px-4 py-2 rounded font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 ${isWizard ? 'bg-yellow-600 text-black' : 'bg-blue-600 text-white'}`}>{isSavingOrder ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isSavingOrder ? 'Saving...' : 'Save Order'}</button>}
                            {(search || dateFilter || subjectFilter || showPinnedOnly) && <button onClick={() => { setSearch(''); setDateFilter(''); setSubjectFilter(''); setShowPinnedOnly(false); }} className={`p-2 rounded hover:bg-white/10 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'} shrink-0 self-end md:self-auto`}><X size={20} /></button>}
                        </div>
                        {!isLectures && <div className={`flex items-center gap-1 p-1 rounded border shrink-0 justify-center ${isWizard ? 'border-emerald-800 bg-black/40' : 'border-fuchsia-800 bg-black/40'}`}><button onClick={() => { setSubjectFilter(''); setViewMode('folders'); }} className={`p-2 rounded transition-all ${viewMode === 'folders' ? (isWizard ? 'bg-emerald-800 text-emerald-100' : 'bg-fuchsia-800 text-fuchsia-100') : 'text-white/40 hover:text-white'}`}><FolderOpen size={16} /></button><div className="w-px h-4 bg-white/10 mx-1"></div><button onClick={() => setViewMode('masonry')} className={`p-2 rounded transition-all ${viewMode === 'masonry' ? (isWizard ? 'bg-emerald-800 text-emerald-100' : 'bg-fuchsia-800 text-fuchsia-100') : 'text-white/40 hover:text-white'}`}><LayoutGrid size={16} /></button><button onClick={() => setViewMode('list')} className={`p-2 rounded transition-all ${viewMode === 'list' ? (isWizard ? 'bg-emerald-800 text-emerald-100' : 'bg-fuchsia-800 text-fuchsia-100') : 'text-white/40 hover:text-white'}`}><List size={16} /></button></div>}
                    </>
                )}
            </div>

            {/* LECTURE SECTOR: SPECIAL TIMETABLE VIEW */}
            {isLectures && renderTimetable()}

            {/* MAIN CONTENT GRID */}
            {viewMode === 'folders' && !search && !dateFilter && !isLectures && !showPinnedOnly ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fade-in_0.3s]">
                    {subjects.map((subject, idx) => {
                        const subjectItems = localDisplayItems.filter(i => (i.subject || 'General') === subject);
                        const count = subjectItems.length;
                        const coverItem = subjectItems.find(i => i.image && i.image.length > 0);
                        const coverImage = coverItem?.image;
                        return (
                            <div key={idx} className="relative group">
                                <button onClick={() => { setSubjectFilter(subject); setViewMode('masonry'); }} className={`w-full h-40 relative overflow-hidden rounded-2xl border p-6 flex flex-col justify-end gap-2 text-left transition-all duration-500 hover:scale-[1.02] ${isWizard ? 'bg-black/60 border-emerald-900/50 hover:border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'bg-black/60 border-fuchsia-900/50 hover:border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.05)]'}`}>
                                    {coverImage ? <><div className="absolute inset-0 bg-cover bg-center blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-700 transform scale-110" style={{ backgroundImage: `url(${coverImage})` }}></div><div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30"></div></> : <Book size={100} className={`absolute -right-4 -top-4 opacity-5 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110 ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} />}
                                    <span className={`relative z-10 text-2xl font-bold leading-none drop-shadow-lg ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>{subject}</span>
                                    <div className={`relative z-10 flex items-center gap-2 text-xs opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-md ${isWizard ? 'font-wizard text-emerald-200' : 'font-muggle text-fuchsia-200'}`}><div className={`h-px w-8 ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>{count} {isWizard ? 'Scrolls' : 'Files'}</div>
                                </button>
                                {isAdmin && (<div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">{onUpdateSubject && <button onClick={(e) => { e.stopPropagation(); setEditingSubject({ originalName: subject, name: subject, image: coverImage || '' }); }} className="p-2 rounded-full bg-blue-600/80 text-white hover:bg-blue-500"><Edit2 size={16} /></button>}{onDelete && <button onClick={(e) => { e.stopPropagation(); if (!onDelete) return; const count = items.filter(i => (i.subject || 'General') === subject).length; if (!confirm(`Delete "${subject}" and ALL ${count} items?`)) return; items.filter(i => (i.subject || 'General') === subject).forEach(item => onDelete(item.id)); }} className="p-2 rounded-full bg-red-900/80 text-white hover:bg-red-700"><Trash2 size={16} /></button>}</div>)}
                            </div>
                        );
                    })}
                    {isAdmin && onQuickCreate && (
                        <div className={`h-40 relative overflow-hidden rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-300 ${isWizard ? 'border-emerald-900/50 hover:border-emerald-500/50 hover:bg-emerald-900/10' : 'border-fuchsia-900/50 hover:border-fuchsia-500/50 hover:bg-fuchsia-900/10'}`}>
                            {!isCreatingSubject ? <button onClick={() => setIsCreatingSubject(true)} className={`flex flex-col items-center justify-center w-full h-full text-white/50 hover:text-white transition-colors`}><FolderPlus size={40} className="mb-2" /><span className="font-bold uppercase tracking-widest text-xs">Create Subject</span></button> : <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-black/80 animate-[fade-in_0.2s]"><input ref={inputRef} type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject Name..." onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSubject(); if (e.key === 'Escape') { setIsCreatingSubject(false); setNewSubjectName(''); } }} className={`w-full bg-transparent border-b outline-none text-center font-bold text-sm mb-2 ${isWizard ? 'border-emerald-500 text-emerald-100 placeholder:text-emerald-800' : 'border-fuchsia-500 text-fuchsia-100 placeholder:text-fuchsia-800'}`} /><input type="text" value={newSubjectImage} onChange={(e) => setNewSubjectImage(e.target.value)} placeholder="Cover Image URL (Optional)..." className={`w-full bg-transparent border-b outline-none text-center text-[10px] mb-2 opacity-70 ${isWizard ? 'border-emerald-800 text-emerald-200' : 'border-fuchsia-800 text-fuchsia-200'}`} /><div className="flex gap-2"><button onClick={handleCreateSubject} disabled={isProcessing} className={`px-4 py-1.5 rounded text-[10px] font-bold ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}>{isProcessing ? <Loader2 size={12} className="animate-spin" /> : 'CREATE'}</button><button onClick={() => { setIsCreatingSubject(false); setNewSubjectName(''); setNewSubjectImage(''); }} className="px-4 py-1.5 rounded text-[10px] font-bold border border-white/20 hover:bg-white/10">CANCEL</button></div></div>}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Standard List/Grid View for Files & Announcements */}
                    {!isLectures && (
                        <div className={`mb-4 flex items-center justify-between px-2 ${isWizard ? 'font-wizard text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>
                            <div className="text-xs opacity-50">Found {filteredItems.length} {isWizard ? 'artifacts' : 'records'}</div>
                            <div className="flex items-center gap-2 text-[10px] opacity-70 uppercase tracking-widest border border-white/10 px-2 py-1 rounded">
                                <span>Sorted by: {activeSortOrder === 'alphabetical' ? 'Name' : activeSortOrder === 'oldest' ? 'Date (Oldest)' : activeSortOrder === 'manual' ? 'Manual' : 'Date (Newest)'}</span>
                            </div>
                        </div>
                    )}

                    {filteredItems.length === 0 ? (
                        isLectures ? (
                            <div className="text-center py-10 opacity-40">
                                <p className="text-sm">No special announcements. Check the timetable above!</p>
                            </div>
                        ) : (
                            <div className="text-center py-20 opacity-40"><Search size={48} className="mx-auto mb-4" /><div className={`text-2xl font-bold mb-2 ${isWizard ? 'font-wizardTitle text-emerald-300' : 'font-muggle text-fuchsia-300'}`}>EMPTY SECTOR</div><p className="text-sm opacity-60">{isWizard ? "The scrolls are blank..." : "No data found."}</p></div>
                        )
                    ) : (
                        <div className={viewMode === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
                            {filteredItems.map((item) => {
                                const customStyle = item.style || {};
                                const hasLink = item.fileUrl && (item.fileUrl.startsWith('http') || item.fileUrl.startsWith('https'));
                                const titleStyle = customStyle.isGradient ? { backgroundImage: `linear-gradient(to right, ${customStyle.titleColor}, ${customStyle.titleColorEnd || customStyle.titleColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent', fontFamily: customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : 'inherit' } : { color: customStyle.titleColor || '#ffffff', fontFamily: customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : 'inherit' };
                                const previewContent = DOMPurify.sanitize(item.content, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'span'], ALLOWED_ATTR: ['style', 'class'] });

                                return (
                                    <div key={item.id} draggable={isAdmin && isManualSort} onDragStart={(e) => handleDragStart(e, item)} onDragOver={(e) => handleDragOver(e, item)} onDrop={(e) => handleDrop(e, item)} onClick={() => onViewItem(item)} onContextMenu={(e) => handleContextMenu(e, item)} className={`relative rounded-xl border backdrop-blur-md group transition-all duration-300 cursor-pointer overflow-hidden select-none ${viewMode === 'list' ? 'p-4 flex items-center gap-4 hover:translate-x-1' : 'p-6 flex flex-col gap-4 hover:-translate-y-1 h-full'} ${isWizard ? 'bg-black/40 border-emerald-900/50 hover:bg-emerald-900/10' : 'bg-black/40 border-fuchsia-900/50 hover:bg-fuchsia-900/10'} ${item.isPinned ? (isWizard ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-yellow-500') : ''} ${draggedItem?.id === item.id ? 'opacity-20' : 'opacity-100'}`}>
                                        {item.isPinned && <div className={`absolute top-0 right-0 p-1.5 rounded-bl-lg shadow-sm ${isWizard ? 'bg-emerald-800 text-yellow-300' : 'bg-fuchsia-800 text-yellow-300'}`}><Pin size={12} fill="currentColor" /></div>}
                                        {item.image && viewMode === 'masonry' && <div className="w-full h-32 overflow-hidden rounded-lg relative"><img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /><div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div></div>}
                                        {viewMode === 'list' && item.image && <div className="w-16 h-16 shrink-0 overflow-hidden rounded-lg"><img src={item.image} alt={item.title} className="w-full h-full object-cover" /></div>}
                                        {!item.image && <div className={`shrink-0 rounded-full flex items-center justify-center z-10 ${viewMode === 'list' ? 'w-12 h-12' : 'w-12 h-12 mb-2'} ${isWizard ? 'bg-emerald-900/30 text-emerald-400' : 'bg-fuchsia-900/30 text-fuchsia-400'}`}>{getTypeIcon(item.type)}</div>}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">{item.subject && <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border opacity-60 ${isWizard ? 'border-emerald-800 text-emerald-300' : 'border-fuchsia-800 text-fuchsia-300'}`}>{item.subject}</span>}<div className={`flex items-center gap-1 text-[10px] opacity-50 ${isWizard ? 'font-wizard' : 'font-muggle'}`}><Calendar size={10} /><span>{item.date}</span></div></div>
                                            <h4 className={`font-bold leading-tight truncate ${viewMode === 'list' ? 'text-lg' : 'text-lg mb-2'}`} style={titleStyle}>{item.title}</h4>
                                            {!hasLink && <div className={`text-xs opacity-70 line-clamp-3 mt-1 ${isWizard ? 'font-wizard' : 'font-muggle'}`} dangerouslySetInnerHTML={{ __html: previewContent }} />}
                                            {hasLink && <div className="mt-2 pt-2 border-t border-white/5 flex"><a href={item.fileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={`flex items-center justify-center gap-2 px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg ${isWizard ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-black'}`}><ExternalLink size={14} /> OPEN LINK</a></div>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }` }} />
            <style dangerouslySetInnerHTML={{__html: `@import url('https://fonts.googleapis.com/css2?family=ITC+Benguiat&display=swap'); /* Note: You might need a close match if ITC Benguiat isn't free, e.g., 'Merriweather' or use system serif */.stranger-things-title {text-shadow: 0 0 5px rgba(220, 38, 38, 0.5),0 0 10px rgba(220, 38, 38, 0.3),3px 3px 0px #000;}@keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}} /></div>
    );
};

export default SectorView;