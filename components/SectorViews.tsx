import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Lineage, Sector, CarouselItem, LectureRule, GlobalConfig,
    SECTORS
} from '../types';
import {
    Book, FileText, Video, Calendar, Search, Filter, X, Trash2, LayoutGrid, List,
    FolderOpen, ArrowLeft, Edit2, Plus, FolderPlus, Loader2, Image as ImageIcon,
    Send, Link as LinkIcon, ExternalLink, Layers, Code, Pin, PinOff, Save, Check,
    Clock, CalendarDays, MousePointer2, Columns, PlayCircle,
    ChevronRight, AlertTriangle // 👈 Ensures icons are imported
} from 'lucide-react';
import CalendarWidget from './CalendarWidget';
import DOMPurify from 'dompurify';
import { trackActivity } from '../services/tracking';

interface SectorViewProps {
    items: CarouselItem[];
    allItems?: CarouselItem[];
    lineage: Lineage | null;
    sectorId: string;
    onViewItem: (item: CarouselItem) => void;
    isAdmin?: boolean;
    onDelete?: (id: string) => void;
    onEdit?: (item: CarouselItem) => void;
    onUpdateItem?: (item: CarouselItem) => Promise<void>;
    onBack?: () => void;
    onAddItem?: (sectorId: string) => void;
    onQuickCreate?: (item: CarouselItem) => Promise<void>;
    onUpdateSubject?: (oldName: string, newName: string, newImage?: string) => Promise<void>;
    onReorder?: (updates: { id: string, order_index: number }[]) => Promise<void>;

    // New Props for V2.5 Scheduler
    schedules?: LectureRule[];
    config?: GlobalConfig;
    sectors?: Sector[];
    quickInputOnly?: boolean;
}

const ACADEMIC_SECTORS = ['books', 'notes', 'resources', 'tasks'];

// --- TIMEZONE HELPERS (IST - Asia/Kolkata) ---
const getISTDateStr = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const getISTDayName = (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
};

// --- SCHEDULER HELPERS (V2.5) ---
const isDateInRange = (checkDate: Date, start?: string, end?: string) => {
    if (!start && !end) return true; // No range = always active
    const target = new Date(checkDate).setHours(0, 0, 0, 0);
    const s = start ? new Date(start).setHours(0, 0, 0, 0) : -Infinity;
    const e = end ? new Date(end).setHours(0, 0, 0, 0) : Infinity;
    return target >= s && target <= e;
};

const isDayMatch = (checkDate: Date, days?: string[], legacyDay?: string) => {
    const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
    if (days && days.length > 0) {
        return days.includes(dayName);
    }
    return legacyDay === dayName;
};

// --- TREE LEAF NODE COMPONENT (Updated for Images & Mobile) ---
const TreeLeafNode = ({
    item, index, isLeft, colorClass, onPlay
}: {
    item: CarouselItem, index: number, isLeft: boolean, colorClass: string, onPlay: (item: CarouselItem) => void
}) => (
    <div
        className={`
            relative flex items-center mb-8 md:mb-12 w-full group 
            ${isLeft ? 'md:flex-row-reverse flex-row' : 'flex-row'}
        `}
        style={{ perspective: '1000px' }}
    >
        {/* 1. The Leaf Card (3D) */}
        <div
            onClick={() => onPlay(item)}
            className={`
                w-full ml-8 md:ml-0 md:w-[45%] relative cursor-pointer transition-all duration-500 transform-style-3d
                hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]
                bg-black/80 backdrop-blur-md rounded-xl overflow-hidden border group-hover:z-20
                flex flex-col md:flex-row
                ${colorClass === 'blue' ? 'border-blue-500/30 shadow-blue-900/20' : 'border-fuchsia-500/30 shadow-fuchsia-900/20'}
            `}
        >
            {/* Connector Dot */}
            <div className={`
                absolute top-1/2 w-4 h-4 rounded-full transform -translate-y-1/2 border-2 border-black
                ${colorClass === 'blue' ? 'bg-blue-400 box-shadow-blue' : 'bg-fuchsia-400 box-shadow-fuchsia'}
                -left-2 md:left-auto
                ${isLeft ? 'md:-right-2' : 'md:-left-2'}
                z-30
            `}></div>

            {/* Image Section (Thumbnail) */}
            <div className="w-full md:w-40 h-32 md:h-auto shrink-0 relative bg-black/50 border-b md:border-b-0 md:border-r border-white/5">
                {item.image ? (
                    <img src={item.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                        <PlayCircle size={32} className={`opacity-20 ${colorClass === 'blue' ? 'text-blue-400' : 'text-fuchsia-400'}`} />
                    </div>
                )}
                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className={`p-2 rounded-full backdrop-blur-md shadow-lg ${colorClass === 'blue' ? 'bg-blue-600 text-white' : 'bg-fuchsia-600 text-white'}`}>
                        <PlayCircle size={24} fill="currentColor" />
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${colorClass === 'blue' ? 'bg-blue-900/30 border-blue-500/30 text-blue-300' : 'bg-fuchsia-900/30 border-fuchsia-500/30 text-fuchsia-300'}`}>
                        {item.batch || 'AICS'}
                    </span>
                    <span className="text-[10px] opacity-50 uppercase tracking-wider truncate border border-white/10 px-1.5 py-0.5 rounded">{item.subject}</span>
                </div>

                <h4 className={`text-base font-bold leading-tight mb-2 line-clamp-2 ${colorClass === 'blue' ? 'text-blue-50' : 'text-fuchsia-50'}`}>
                    {item.title}
                </h4>

                <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-xs opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="flex items-center gap-1 font-mono">{item.date}</span>
                    <span className={`flex items-center gap-1 font-bold ${colorClass === 'blue' ? 'text-blue-400' : 'text-fuchsia-400'}`}>
                        WATCH <ChevronRight size={12} />
                    </span>
                </div>
            </div>
        </div>

        {/* 2. The Branch Connection (Desktop Only) */}
        <div className="hidden md:flex flex-1 h-[2px] relative">
            <div className={`absolute top-1/2 w-full h-[1px] ${colorClass === 'blue' ? 'bg-blue-500/30' : 'bg-fuchsia-500/30'}`}></div>
            <div className={`absolute top-1/2 w-2 h-1 rounded-full animate-ping ${colorClass === 'blue' ? 'bg-blue-400' : 'bg-fuchsia-400'} opacity-50`} style={{ left: isLeft ? '10%' : '90%' }}></div>
        </div>

        {/* 3. The Trunk Node */}
        <div className={`
            absolute left-0 md:relative md:left-auto
            w-4 h-4 rounded-full border-2 z-10 bg-[#0a0a0a] 
            ${colorClass === 'blue' ? 'border-blue-500 shadow-[0_0_10px_#3b82f6]' : 'border-fuchsia-500 shadow-[0_0_10px_#d946ef]'}
        `}></div>

        {/* Spacer */}
        <div className="hidden md:block flex-1"></div>
    </div>
);

export const SectorView: React.FC<SectorViewProps> = ({
    items, allItems, lineage, sectorId, onViewItem, isAdmin, onDelete, onEdit,
    onUpdateItem, onBack, onAddItem, onQuickCreate, onUpdateSubject, onReorder,
    schedules = [], config, sectors = [], quickInputOnly
}) => {
    const isWizard = lineage === Lineage.WIZARD;
    const currentSector = sectors.find(s => s.id === sectorId) || SECTORS[0];
    const isLectures = sectorId === 'lectures';
    const isResources = sectorId === 'resources'; // Helper for Link Tree

    // --- TRACKING ---
    useEffect(() => {
        try {
            const profile = JSON.parse(localStorage.getItem('core_connect_profile') || '{}');
            if (profile.id && !quickInputOnly) {
                trackActivity(profile.id, 'ENTER_SECTOR', sectorId, sectorId, 0, profile.displayName);
            }
        } catch (e) { }
    }, [sectorId, quickInputOnly]);

    // --- CINEMA STATE ---
    const [cinemaMode, setCinemaMode] = useState(false);
    const [cinemaItem, setCinemaItem] = useState<CarouselItem | null>(null);

    // ✨ NEW: Handle Escape Key to Close Player
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && cinemaMode) {
                setCinemaMode(false);
                setCinemaItem(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cinemaMode]);

    // --- HANDLER ---
    const handlePlayItem = (item: CarouselItem) => {
        // If content has iframe/div (embed code), use Cinema Mode. 
        // If it is just a URL, open in new tab.
        if (item.content && (item.content.includes('<iframe') || item.content.includes('<div'))) {
            setCinemaItem(item);
            setCinemaMode(true);
        } else if (item.fileUrl) {
            window.open(item.fileUrl, '_blank');
        }
    };

    // State
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState<string>(''); // For item filtering
    const [subjectFilter, setSubjectFilter] = useState('');

    // Default View Mode: 'columns' for lectures, 'folders' for others
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'folders' | 'masonry' | 'columns'>('folders');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [showPinnedOnly, setShowPinnedOnly] = useState(false);

    // Lecture & Tree Specific State
    const [activeBatch, setActiveBatch] = useState<'AICS' | 'CSDA'>('AICS');
    // Default to IST Today for Scheduler
    const [scheduleDate, setScheduleDate] = useState<string>(getISTDateStr());

    // Drag & Drop State
    const [draggedItem, setDraggedItem] = useState<CarouselItem | null>(null);
    const [localDisplayItems, setLocalDisplayItems] = useState<CarouselItem[]>([]);
    const [isOrderChanged, setIsOrderChanged] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Admin UI State
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
    const subjects = useMemo(() => Array.from(new Set((items || []).map(i => i.subject || 'General'))).sort(), [items]);
    const activeSortOrder = currentSector?.sortOrder || 'newest';
    const isManualSort = activeSortOrder === 'manual';

    // --- ITEM SORTING & FILTERING (Files/Announcements) ---
    useEffect(() => {
        let combined = [...(items || [])]; // Safety check
        combined.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            if (activeSortOrder === 'manual') {
                const orderA = a.order_index ?? 9999;
                const orderB = b.order_index ?? 9999;
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
        const source = search ? (allItems || items || []) : localDisplayItems;
        return source.filter(item => {
            const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                item.content.toLowerCase().includes(search.toLowerCase());

            const normalizedItemDate = item.date.replace(/-/g, '.');
            const normalizedFilter = dateFilter.replace(/-/g, '.');
            // For non-lectures, only filter by date if user explicitly picked one via Calendar widget
            const matchDate = (!isLectures && !dateFilter) ? true : (isLectures ? true : normalizedItemDate === normalizedFilter);

            const matchSector = search ? true : item.sector === sectorId;
            const matchSubject = subjectFilter ? (item.subject || 'General') === subjectFilter : true;
            const matchesPinned = showPinnedOnly ? item.isPinned : true;
            return matchSearch && matchSector && matchDate && matchSubject && matchesPinned;
        });
    }, [items, allItems, localDisplayItems, search, sectorId, dateFilter, subjectFilter, showPinnedOnly, isLectures]);

    // --- SCHEDULER LOGIC (V2.5) ---
    const getClassesForDate = (dateStr: string, batch?: string) => {
        if (!schedules || !isLectures) return [];
        const targetDate = new Date(dateStr);

        return schedules.filter(rule => {
            if (!rule.isActive) return false;

            // Batch Filtering logic:
            if (batch === 'AICS' && rule.batch && rule.batch !== 'AICS') return false;
            if (batch === 'CSDA' && rule.batch !== 'CSDA') return false;

            // General batch filter for Unified View
            if (!batch && rule.batch && rule.batch !== activeBatch && rule.batch !== 'AICS') return false;

            if (!isDateInRange(targetDate, rule.startDate, rule.endDate)) return false;
            return isDayMatch(targetDate, rule.days);
        }).sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    // --- DRAG & DROP HANDLERS (Standard) ---
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

    // --- UI EFFECTS ---
    useEffect(() => {
        if ((search) && viewMode === 'folders' && !isLectures) { setViewMode('masonry'); }
    }, [search, viewMode, isLectures]);

    useEffect(() => {
        setSearch(''); setDateFilter(''); setSubjectFilter(''); setShowPinnedOnly(false);

        if (isLectures) {
            const isMobile = window.innerWidth < 768;
            setViewMode(isMobile ? 'grid' : 'columns');
            setDateFilter(getISTDateStr());
        } else {
            setViewMode('folders');
            setDateFilter('');
        }
    }, [sectorId, isLectures]);

    // --- ACTIONS ---
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
        switch (type) { case 'video': return <Video size={20} />; case 'file': return <FileText size={20} />; case 'mixed': return <Layers size={20} />; case 'code': return <Code size={20} />; case 'link': return <LinkIcon size={20} />; case 'link_tree': return <PlayCircle size={20} />; default: return <FileText size={20} />; }
    };

    // --- ADMIN HUD QUICK CREATE ---
    if (quickInputOnly) {
        return (
            <div className={`relative flex items-center p-2 rounded-lg border backdrop-blur-sm transition-all ${isWizard ? 'bg-emerald-950/40 border-emerald-500/30 focus-within:border-emerald-400' : 'bg-fuchsia-950/40 border-fuchsia-500/30 focus-within:border-fuchsia-400'}`}>
                <input type="text" value={quickPostText} onChange={(e) => setQuickPostText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuickPost()} placeholder="Lazy Post: Type message & press Enter..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30 px-2" disabled={isPosting} />
                <button onClick={handleQuickPost} disabled={!quickPostText.trim() || isPosting} className={`p-2 rounded-full transition-colors ${isWizard ? 'text-emerald-400 hover:bg-emerald-900/50' : 'text-fuchsia-400 hover:bg-fuchsia-900/50'}`}>{isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
            </div>
        );
    }

    // ==========================================
    // RENDERER: LECTURE CARD (Shared)
    // ==========================================
    const LectureCard3D = ({ cls, color }: { cls: LectureRule, color: 'blue' | 'fuchsia' }) => {
        return (
            <div className="perspective-1000 group">
                <div
                    onClick={() => window.open(cls.link, '_blank')}
                    className={`
                    relative rounded-xl overflow-hidden border border-white/10 flex flex-col 
                    bg-[#121212] cursor-pointer ring-1 ring-white/5 
                    transition-all duration-500 ease-out transform-style-3d
                    hover:rotate-x-2 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.7)] hover:border-white/30
                    group-hover:z-10
                `}
                >
                    <div className="h-40 w-full relative overflow-hidden bg-black">
                        {cls.image ? (
                            <img src={cls.image} alt={cls.subject} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-110" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center opacity-30 bg-gradient-to-br ${color === 'blue' ? 'from-blue-900 via-blue-800' : 'from-fuchsia-900 via-purple-900'} to-black`}>
                                <Video size={48} className="text-white drop-shadow-lg" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent"></div>
                        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-xl flex items-center gap-2 z-10 translate-z-10">
                            <Clock size={12} className={color === 'blue' ? 'text-blue-400' : 'text-fuchsia-400'} />
                            {cls.startTime} {cls.endTime ? `- ${cls.endTime}` : ''}
                        </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col relative -mt-10 z-20">
                        <div className={`w-12 h-12 rounded-2xl rotate-3 flex items-center justify-center border-4 border-[#121212] shadow-2xl mb-3 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 translate-z-20 ${color === 'blue' ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gradient-to-br from-fuchsia-600 to-purple-800'}`}>
                            <Video size={20} className="text-white drop-shadow-md" />
                        </div>
                        <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-blue-300 transition-colors translate-z-10">{cls.subject}</h3>
                        <div className="mb-4 flex-1">
                            {cls.customMessage ? (
                                <p className="text-sm text-zinc-400 leading-relaxed border-l-2 border-white/10 pl-3 italic line-clamp-3">{cls.customMessage}</p>
                            ) : (
                                <p className="text-sm text-zinc-600 italic">No class notes.</p>
                            )}
                        </div>
                        {cls.link && (
                            <button className={`
                            relative overflow-hidden w-full py-3 rounded-lg font-bold text-xs uppercase tracking-[0.2em] 
                            text-center transition-all shadow-lg flex items-center justify-center gap-3 group/btn translate-z-10
                            ${color === 'blue'
                                    ? 'bg-blue-600/10 border border-blue-500/30 text-blue-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500'
                                    : 'bg-fuchsia-600/10 border border-fuchsia-500/30 text-fuchsia-200 group-hover:bg-fuchsia-600 group-hover:text-white group-hover:border-fuchsia-500'}
                        `}>
                                <span className="relative z-10 flex items-center gap-2">JOIN SESSION <ExternalLink size={14} className="transition-transform group-hover/btn:translate-x-1" /></span>
                                <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 transform translate-y-4 group-hover:translate-y-0 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20">
                                    <MousePointer2 size={24} className="fill-white text-black animate-bounce" />
                                </div>
                            </button>
                        )}
                    </div>
                </div>
                <style jsx>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .translate-z-10 { transform: translateZ(10px); }
                .translate-z-20 { transform: translateZ(20px); }
                .rotate-x-2 { transform: rotateX(2deg); }
            `}</style>
            </div>
        );
    };

    // ==========================================
    // RENDERER: COLUMNS VIEW (Original Side-by-Side)
    // ==========================================
    const renderSideBySideSchedule = () => {
        const aicsClasses = getClassesForDate(dateFilter, 'AICS');
        const csdaClasses = getClassesForDate(dateFilter, 'CSDA');
        const renderEmpty = (text: string, color: 'blue' | 'fuchsia') => (
            <div className={`py-12 px-6 text-center border-2 border-dashed rounded-2xl backdrop-blur-md transition-all flex flex-col items-center justify-center min-h-[150px]
            ${color === 'blue'
                    ? 'border-blue-500/30 bg-blue-950/40 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                    : 'border-fuchsia-500/30 bg-fuchsia-950/40 text-fuchsia-100 shadow-[0_0_20px_rgba(217,70,239,0.1)]'}
        `}>
                <div className={`p-4 rounded-full mb-3 ${color === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-fuchsia-500/20 text-fuchsia-300'}`}>
                    <Calendar size={28} />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-90">{text}</p>
            </div>
        );

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-[fade-in_0.3s]">
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-blue-950/20 p-3 rounded-lg border border-blue-500/20 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"></div>
                            <div>
                                <h3 className="font-bold text-blue-100 leading-none">AICS</h3>
                                <div className="text-[10px] text-blue-300/60 uppercase tracking-wider">Artificial Intelligence</div>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono bg-blue-900/40 text-blue-300 px-2 py-1 rounded border border-blue-500/20">{aicsClasses.length} Events</span>
                    </div>
                    <div className="grid gap-6">
                        {aicsClasses.length > 0 ? aicsClasses.map(c => <LectureCard3D key={c.id} cls={c} color="blue" />) : renderEmpty("No AICS classes.", 'blue')}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-fuchsia-950/20 p-3 rounded-lg border border-fuchsia-500/20 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1 bg-fuchsia-500 rounded-full shadow-[0_0_10px_#d946ef]"></div>
                            <div>
                                <h3 className="font-bold text-fuchsia-100 leading-none">CSDA</h3>
                                <div className="text-[10px] text-fuchsia-300/60 uppercase tracking-wider">Data Analytics</div>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono bg-fuchsia-900/40 text-fuchsia-300 px-2 py-1 rounded border border-fuchsia-500/20">{csdaClasses.length} Events</span>
                    </div>
                    <div className="grid gap-6">
                        {csdaClasses.length > 0 ? csdaClasses.map(c => <LectureCard3D key={c.id} cls={c} color="fuchsia" />) : renderEmpty("No CSDA classes.", 'fuchsia')}
                    </div>
                </div>
            </div>
        );
    };

    // ==========================================
    // RENDERER: UNIFIED LIST/GRID
    // ==========================================
    const renderUnifiedSchedule = () => {
        const activeClasses = getClassesForDate(dateFilter, activeBatch);
        const color = activeBatch === 'AICS' ? 'blue' : 'fuchsia';

        return (
            <div className={`grid gap-6 animate-[fade-in_0.3s] ${viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {activeClasses.length > 0 ? (
                    activeClasses.map(cls => <LectureCard3D key={cls.id} cls={cls} color={color} />)
                ) : (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5 opacity-60 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse"><Calendar size={40} className="text-white/30" /></div>
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">No Lectures Found</h3>
                        <p className="text-base text-zinc-400 max-w-md mx-auto">There are no classes scheduled for <span className="text-white font-bold">{new Date(dateFilter).toLocaleDateString()}</span> for {activeBatch}.</p>
                    </div>
                )}
            </div>
        );
    };

    // --- MAIN RENDER ---
    return (
        <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 pb-24 animate-[fade-in_0.3s_ease-out] ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
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
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingSubject(null)} className="px-4 py-2 rounded text-white/50 hover:text-white">Cancel</button>
                            <button onClick={async () => { if (onUpdateSubject) { setIsProcessing(true); await onUpdateSubject(editingSubject.originalName, editingSubject.name, editingSubject.image); setIsProcessing(false); setEditingSubject(null); } }} disabled={isProcessing} className={`px-6 py-2 rounded font-bold flex items-center gap-2 ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}>{isProcessing ? <Loader2 className="animate-spin" /> : <Check size={18} />} Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8 border-b border-white/10 pb-4">
                <div className="flex-1 w-full md:w-auto">
                    <div className="flex items-center gap-4 mb-2">
                        {onBack && (
                            <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h2 className={`text-2xl font-bold ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
                            {isWizard ? currentSector.wizardName : currentSector.muggleName}
                        </h2>
                    </div>

                    {!isLectures && (
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-2.5 text-white/30" size={14} />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${isWizard ? 'Archives' : 'Database'}...`}
                                className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none transition-all
                                ${isWizard ? 'bg-[#050a05]/80 border-emerald-900/50 focus:border-emerald-500/50 text-emerald-100' : 'bg-[#0a050a]/80 border-fuchsia-900/50 focus:border-fuchsia-500/50 text-fuchsia-100'}
                            `}
                            />
                        </div>
                    )}

                    {isLectures && (
                        <div className="flex items-center gap-3 mt-1">
                            <div className="text-sm font-bold opacity-80 bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10">
                                <CalendarDays size={14} className="text-white/60" />
                                {getISTDayName(dateFilter)}, {new Date(dateFilter).toLocaleDateString()}
                            </div>
                            <div className="relative overflow-hidden w-9 h-9 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 transition-colors cursor-pointer flex items-center justify-center group" title="Change Date">
                                <Calendar size={16} className="text-blue-300 group-hover:text-white" />
                                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 items-center justify-end w-full md:w-auto">
                    {isLectures && (
                        <div className="flex gap-2 items-center">
                            {viewMode !== 'columns' && (
                                <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                                    <button onClick={() => setActiveBatch('AICS')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activeBatch === 'AICS' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>AICS</button>
                                    <button onClick={() => setActiveBatch('CSDA')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activeBatch === 'CSDA' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>CSDA</button>
                                </div>
                            )}
                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                                <button onClick={() => setViewMode('columns')} className={`p-2 rounded ${viewMode === 'columns' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`} title="Original View (Columns)"><Columns size={18} /></button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`} title="List"><List size={18} /></button>
                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`} title="Grid"><LayoutGrid size={18} /></button>
                            </div>
                        </div>
                    )}
                    {!isLectures && (
                        <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white/20' : 'hover:bg-white/10'}`}><List size={18} /></button>
                            <button onClick={() => setViewMode('masonry')} className={`p-2 rounded ${viewMode === 'masonry' ? 'bg-white/20' : 'hover:bg-white/10'}`}><LayoutGrid size={18} /></button>
                            <button onClick={() => setViewMode('folders')} className={`p-2 rounded ${viewMode === 'folders' ? 'bg-white/20' : 'hover:bg-white/10'}`}><FolderOpen size={18} /></button>
                        </div>
                    )}
                    {isAdmin && onAddItem && (
                        <button onClick={() => onAddItem(sectorId)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded font-bold hover:bg-blue-500 transition-colors text-sm h-full shadow-lg">
                            <Plus size={16} /> <span className="hidden sm:inline">NEW</span>
                        </button>
                    )}
                </div>
            </div>

            {!isLectures && (
                <div className={`mb-8 p-4 rounded-xl border backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between sticky top-2 sm:top-4 z-40 shadow-2xl transition-all mx-2 sm:mx-0 ${isWizard ? 'bg-emerald-950/80 border-emerald-500/50 shadow-black/50' : 'bg-fuchsia-950/80 border-fuchsia-500/50 shadow-black/50'}`}>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <div className="relative z-[40]">
                            <CalendarWidget lineage={lineage} items={localDisplayItems} selectedDate={dateFilter} onSelectDate={setDateFilter} isOpen={calendarOpen} setIsOpen={setCalendarOpen} />
                        </div>
                        <button onClick={() => setShowPinnedOnly(!showPinnedOnly)} className={`flex items-center gap-2 px-4 py-2 rounded border transition-all hover:bg-white/5 whitespace-nowrap ${showPinnedOnly ? (isWizard ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300' : 'bg-fuchsia-900/40 border-fuchsia-500 text-fuchsia-300') : (isWizard ? 'border-emerald-700 text-emerald-100' : 'border-fuchsia-700 text-fuchsia-100')}`} title="Show Pinned Messages Only">
                            <Pin size={16} fill={showPinnedOnly ? "currentColor" : "none"} />
                            <span className={isWizard ? 'font-wizard' : 'font-muggle text-xs'}>{showPinnedOnly ? "Pinned" : "All"}</span>
                        </button>
                        <div className="relative min-w-[140px]">
                            <select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); if (e.target.value && viewMode === 'folders') setViewMode('masonry'); }} className={`w-full px-4 py-2 rounded border bg-transparent outline-none appearance-none cursor-pointer text-base h-full ${isWizard ? 'border-emerald-700 text-emerald-100 bg-[#050a05] font-wizard' : 'border-fuchsia-700 text-fuchsia-100 bg-[#09050f] font-muggle'}`}>
                                <option value="" className="bg-black">{isWizard ? "All Subjects" : "All Directories"}</option>
                                {subjects.map(sub => <option key={sub} value={sub} className="bg-black text-white">{sub}</option>)}
                            </select>
                            <Filter className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50`} />
                        </div>
                        {(search || dateFilter || subjectFilter || showPinnedOnly) && <button onClick={() => { setSearch(''); setDateFilter(''); setSubjectFilter(''); setShowPinnedOnly(false); }} className={`p-2 rounded hover:bg-white/10 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'} shrink-0 self-end md:self-auto`}><X size={20} /></button>}
                    </div>
                    {isAdmin && isManualSort && isOrderChanged && <button onClick={handleSaveOrder} disabled={isSavingOrder} className={`flex items-center gap-2 px-4 py-2 rounded font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 ${isWizard ? 'bg-yellow-600 text-black' : 'bg-blue-600 text-white'}`}>{isSavingOrder ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isSavingOrder ? 'Saving...' : 'Save Order'}</button>}
                </div>
            )}

            {isLectures && (
                viewMode === 'columns' ? renderSideBySideSchedule() : renderUnifiedSchedule()
            )}

            {!isLectures && (viewMode === 'folders' && !search && !dateFilter && !showPinnedOnly ? (
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
                    {/* --- NEW LINK TREE VIEW IMPLEMENTATION --- */}
                    {isResources && subjectFilter && filteredItems.some(i => i.type === 'link_tree') ? (
                        <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 animate-[fade-in_0.5s]">

                            {/* 1. Header & Batch Toggle Switch */}
                            <div className="flex flex-col items-center justify-center mb-8 relative z-10">
                                <div className="text-center mb-6">
                                    <h3 className={`text-3xl font-bold uppercase tracking-[0.2em] mb-2 drop-shadow-xl ${isWizard ? 'font-wizardTitle text-emerald-300' : 'font-muggle text-fuchsia-300'}`}>
                                        Knowledge Tree
                                    </h3>
                                    <p className="text-sm opacity-60 font-mono">Select Frequency Channel</p>
                                </div>

                                {/* THE SWITCH */}
                                <div className="flex p-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-xl relative">
                                    <button
                                        onClick={() => setActiveBatch('AICS')}
                                        className={`relative z-10 px-8 py-2 rounded-full font-bold text-sm transition-all duration-300 ${activeBatch === 'AICS' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        AICS (AI)
                                    </button>
                                    <button
                                        onClick={() => setActiveBatch('CSDA')}
                                        className={`relative z-10 px-8 py-2 rounded-full font-bold text-sm transition-all duration-300 ${activeBatch === 'CSDA' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        CSDA (Data)
                                    </button>

                                    {/* Sliding Background */}
                                    <div
                                        className={`absolute top-1 bottom-1 w-[50%] rounded-full transition-all duration-300 shadow-lg ${activeBatch === 'AICS'
                                            ? 'left-1 bg-gradient-to-r from-blue-900 to-blue-600 border border-blue-400/50'
                                            : 'left-[49%] bg-gradient-to-r from-fuchsia-900 to-fuchsia-600 border border-fuchsia-400/50'
                                            }`}
                                    ></div>
                                </div>
                            </div>

                            {/* 2. THE TREE STRUCTURE */}
                            <div className="relative min-h-[400px] py-10 px-4 md:px-0">

                                {/* Central Trunk (Desktop Only) */}
                                <div className={`hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full rounded-full bg-gradient-to-b from-transparent via-white/20 to-transparent z-0`}>
                                    <div className={`absolute inset-0 w-full h-full animate-pulse ${activeBatch === 'AICS' ? 'bg-blue-500/30 blur-sm' : 'bg-fuchsia-500/30 blur-sm'}`}></div>
                                </div>

                                {/* Mobile Trunk (Left Aligned) - THIS IS NEW FOR PHONES */}
                                <div className={`md:hidden absolute left-4 w-1 h-full rounded-full bg-gradient-to-b from-transparent via-white/20 to-transparent z-0`}>
                                    <div className={`absolute inset-0 w-full h-full animate-pulse ${activeBatch === 'AICS' ? 'bg-blue-500/30 blur-sm' : 'bg-fuchsia-500/30 blur-sm'}`}></div>
                                </div>

                                {/* Leaves */}
                                <div className="relative z-10 flex flex-col md:block">
                                    {filteredItems.filter(i => i.type === 'link_tree' && (!i.batch || i.batch === activeBatch || i.batch === 'General'))
                                        .map((item, index) => (
                                            <TreeLeafNode
                                                key={item.id}
                                                item={item}
                                                index={index}
                                                isLeft={index % 2 === 0}
                                                colorClass={activeBatch === 'AICS' ? 'blue' : 'fuchsia'}
                                                onPlay={handlePlayItem} // <--- THIS IS CRITICAL: It connects the click to the video player
                                            />
                                        ))}
                                </div>
                            </div>

                            {/* Other resources fallback (Tasks/Files) */}
                            {filteredItems.some(i => i.type !== 'link_tree') && (
                                <div className="mt-12 pt-12 border-t border-white/10">
                                    <h4 className="text-center text-sm font-bold opacity-50 mb-8 uppercase tracking-widest">Additional Materials</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredItems.filter(i => i.type !== 'link_tree').map(item => (
                                            <div key={item.id} onClick={() => onViewItem(item)} onContextMenu={(e) => handleContextMenu(e, item)} className={`relative rounded-xl border backdrop-blur-md group transition-all duration-300 cursor-pointer overflow-hidden select-none p-4 flex items-center gap-4 hover:translate-x-1 ${isWizard ? 'bg-black/40 border-emerald-900/50 hover:bg-emerald-900/10' : 'bg-black/40 border-fuchsia-900/50 hover:bg-fuchsia-900/10'}`}>
                                                <div className={`shrink-0 rounded-full flex items-center justify-center w-10 h-10 ${isWizard ? 'bg-emerald-900/30 text-emerald-400' : 'bg-fuchsia-900/30 text-fuchsia-400'}`}>{getTypeIcon(item.type)}</div>
                                                <div className="flex-1 min-w-0 text-left">
                                                    <div className="font-bold truncate text-white">{item.title}</div>
                                                    <div className="text-[10px] opacity-50">{item.date}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // --- STANDARD VIEW (No Change) ---
                        <>
                            {filteredItems.length === 0 ? (
                                <div className="text-center py-20 opacity-40"><Search size={48} className="mx-auto mb-4" /><div className={`text-2xl font-bold mb-2 ${isWizard ? 'font-wizardTitle text-emerald-300' : 'font-muggle text-fuchsia-300'}`}>EMPTY SECTOR</div><p className="text-sm opacity-60">{isWizard ? "The scrolls are blank..." : "No data found."}</p></div>
                            ) : (
                                <div className={viewMode === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
                                    {filteredItems.map(item => (
                                        <div key={item.id} draggable={isAdmin && isManualSort} onDragStart={(e) => handleDragStart(e, item)} onDragOver={(e) => handleDragOver(e, item)} onDrop={(e) => handleDrop(e, item)} onClick={() => onViewItem(item)} onContextMenu={(e) => handleContextMenu(e, item)} className={`relative rounded-xl border backdrop-blur-md group transition-all duration-300 cursor-pointer overflow-hidden select-none ${viewMode === 'list' ? 'p-4 flex items-center gap-4 hover:translate-x-1' : 'p-6 flex flex-col gap-4 hover:-translate-y-1 h-full'} ${isWizard ? 'bg-black/40 border-emerald-900/50 hover:bg-emerald-900/10' : 'bg-black/40 border-fuchsia-900/50 hover:bg-fuchsia-900/10'} ${item.isPinned ? (isWizard ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-yellow-500') : ''} ${draggedItem?.id === item.id ? 'opacity-20' : 'opacity-100'}`}>
                                            {item.isPinned && <div className={`absolute top-0 right-0 p-1.5 rounded-bl-lg shadow-sm ${isWizard ? 'bg-emerald-800 text-yellow-300' : 'bg-fuchsia-800 text-yellow-300'}`}><Pin size={12} fill="currentColor" /></div>}
                                            {item.image && viewMode === 'masonry' && <div className="w-full h-32 overflow-hidden rounded-lg relative"><img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /><div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div></div>}
                                            {viewMode === 'list' && item.image && <div className="w-16 h-16 shrink-0 overflow-hidden rounded-lg"><img src={item.image} alt={item.title} className="w-full h-full object-cover" /></div>}
                                            {!item.image && <div className={`shrink-0 rounded-full flex items-center justify-center z-10 ${viewMode === 'list' ? 'w-12 h-12' : 'w-12 h-12 mb-2'} ${isWizard ? 'bg-emerald-900/30 text-emerald-400' : 'bg-fuchsia-900/30 text-fuchsia-400'}`}>{getTypeIcon(item.type)}</div>}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">{item.subject && <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border opacity-60 ${isWizard ? 'border-emerald-800 text-emerald-300' : 'border-fuchsia-800 text-fuchsia-300'}`}>{item.subject}</span>}<div className={`flex items-center gap-1 text-[10px] opacity-50 ${isWizard ? 'font-wizard' : 'font-muggle'}`}><Calendar size={10} /><span>{item.date}</span></div></div>

                                                {/* FIX: Applied text-white for Title & text-zinc-300 for Content in non-announcement sectors to prevent UI conflict */}
                                                <h4
                                                    className={`font-bold leading-tight truncate ${viewMode === 'list' ? 'text-lg' : 'text-lg mb-2'} ${sectorId !== 'announcements' ? 'text-white' : ''}`}
                                                    style={item.style?.isGradient ? { backgroundImage: `linear-gradient(to right, ${item.style.titleColor}, ${item.style.titleColorEnd || item.style.titleColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' } : { color: item.style?.titleColor }}
                                                >
                                                    {item.title}
                                                </h4>

                                                {!(item.fileUrl && (item.fileUrl.startsWith('http') || item.fileUrl.startsWith('https'))) &&
                                                    <div
                                                        className={`text-xs opacity-70 line-clamp-3 mt-1 ${isWizard ? 'font-wizard' : 'font-muggle'} ${sectorId !== 'announcements' ? 'text-zinc-300' : ''}`}
                                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'span'], ALLOWED_ATTR: ['style', 'class'] }) }}
                                                    />
                                                }

                                                {(item.fileUrl && (item.fileUrl.startsWith('http') || item.fileUrl.startsWith('https'))) && <div className="mt-2 pt-2 border-t border-white/5 flex"><a href={item.fileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={`flex items-center justify-center gap-2 px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg ${isWizard ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-black'}`}><ExternalLink size={14} /> OPEN LINK</a></div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            ))}
            {/* --- CINEMA MODE MODAL (USER FACING) --- */}
            {cinemaMode && cinemaItem && (
                <div className="fixed inset-0 z-[100000] bg-black/95 flex flex-col animate-[fade-in_0.2s] backdrop-blur-sm">

                    {/* Header - MOBILE OPTIMIZED 📱 */}
                    {/* Header - Optimized for both Phone & Laptop */}
                    <div className="flex justify-between items-center p-4 gap-4 border-b border-white/10 bg-[#0f0f0f] shadow-2xl relative z-50">

                        {/* 1. TITLE SECTION */}
                        {/* min-w-0 and overflow-hidden prevent text from pushing button off-screen */}
                        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">

                            {/* LAPTOP ONLY: Show "ARCHIVE PLAYER" text */}
                            <h3 className="font-bold text-white tracking-[0.2em] hidden sm:block shrink-0">
                                ARCHIVE PLAYER
                            </h3>

                            {/* PHONE & LAPTOP: The Item Title */}
                            {/* truncated to ensure it doesn't overlap the cross button */}
                            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/5 min-w-0 max-w-full">
                                <span className="uppercase truncate block">{cinemaItem.title}</span>
                            </div>
                        </div>

                        {/* 2. CLOSE BUTTON SECTION */}
                        {/* shrink-0 ensures this button NEVER disappears or gets squished */}
                        <button
                            onClick={() => { setCinemaMode(false); setCinemaItem(null); }}
                            className="shrink-0 p-3 rounded-full bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 transition-all duration-300 z-50"
                            title="Close Player (Esc)"
                        >
                            <X size={24} className="text-white group-hover:text-red-400 group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    {/* Video Area */}
                    <div className="flex-1 flex items-center justify-center p-2 sm:p-10 relative overflow-hidden">
                        <div className="w-full max-w-6xl aspect-video bg-black shadow-2xl rounded-xl border border-white/10 overflow-hidden relative group">
                            <div
                                key={cinemaItem.id} /* Forces a fresh player */
                                className="w-full h-full"
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(cinemaItem.content, {
                                        /* 1. ALLOW ALL TAGS from your embed code */
                                        ADD_TAGS: ['iframe', 'div', 'style', 'span', 'img'],

                                        /* 2. ALLOW ALL ATTRIBUTES from your embed code + common ones */
                                        ADD_ATTR: [
                                            'allow', 'allowfullscreen', 'frameborder', 'scrolling',
                                            'style', 'width', 'height', 'src', 'title',
                                            'class', 'id', 'name', 'referrerpolicy', 'sandbox', 'loading'
                                        ],

                                        /* 3. FORCE KEEPING CSS (Critical for the "black screen" layout issue) */
                                        FORBID_TAGS: [],
                                        FORBID_ATTR: [],
                                        WHOLE_DOCUMENT: false,
                                    })
                                }}
                            />
                        </div>

                        {/* Warning Footer */}
                        <div className="p-3 bg-yellow-900/10 border-t border-yellow-500/10 flex justify-center backdrop-blur-md">
                            <p className="text-[10px] text-yellow-200/60 flex items-center gap-2 font-mono">
                                <AlertTriangle size={12} />
                                If the video shows a login screen, please ensure you are logged into your college account.
                            </p>
                        </div>
                    </div>
            )}

                    <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }` }} />
                </div>
            );
};

            export default SectorView;