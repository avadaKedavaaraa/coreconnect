
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lineage, type CarouselItem, type Sector, type AdminUser, type AuditLog, SECTORS, type VisitorLog, type LectureRule } from '../types';
import { type GlobalConfig, API_URL } from '../App';
import { 
    ShieldAlert, Lock, Unlock, Plus, Image as ImageIcon, X, Trash2, Calendar, 
    Tag, Layers, Upload, FileUp, Loader2, Edit3, Save, Users, Settings, Volume2, Play,
    Search, HelpCircle, Info, Filter, Eye, Terminal, KeyRound, CheckCircle, Shield, Ban,
    Bold, Italic, Underline, Palette, Type, Database, Sparkles, Wand2, Wrench, Replace,
    ChevronDown, ChevronUp, RefreshCw, PenTool, LayoutTemplate, FileText, Video, ScrollText,
    BrainCircuit, FileCheck, ArrowRight, ScanFace, Fingerprint, Hexagon, FileIcon, MessageSquare,
    Activity, Clock, CalendarDays, Link, Repeat, Send
} from 'lucide-react';

interface AdminPanelProps {
  lineage: Lineage;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  csrfToken: string;
  onLogin: (token: string, permissions: any) => void;
  onLogout: () => void;
  currentUser: string;
  permissions: any; // AdminPermissions
  initialTab?: 'database' | 'creator' | 'scheduler';

  // Data
  allItems?: CarouselItem[];
  sectors?: Sector[];
  globalConfig?: GlobalConfig;
  initialEditingItem?: CarouselItem | null;
  defaultSector?: string;

  // Actions
  onAddItem: (item: CarouselItem) => void;
  onUpdateItem?: (item: CarouselItem) => void;
  onDeleteItem?: (id: string) => void;
  onUpdateSectors?: (sectors: Sector[]) => void;
  onUpdateConfig?: (config: GlobalConfig) => void;
  onClearData: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  lineage, isOpen, onClose, isAdmin, csrfToken, onLogin, onLogout, currentUser, permissions, initialTab = 'database',
  onAddItem, onUpdateItem, onDeleteItem, onUpdateSectors, onUpdateConfig, allItems = [], sectors = [], globalConfig, onClearData, initialEditingItem, defaultSector
}) => {
  const isWizard = lineage === Lineage.WIZARD;
  const [activeTab, setActiveTab] = useState<'creator' | 'ai-lab' | 'database' | 'visitors' | 'structure' | 'users' | 'config' | 'tools' | 'scheduler'>(initialTab);
  
  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // --- CONTENT EDITING STATE ---
  const [itemSearch, setItemSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all'); 
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Scheduler State
  const [schedules, setSchedules] = useState<LectureRule[]>(globalConfig?.schedules || []);
  const [newRule, setNewRule] = useState<Partial<LectureRule>>({
      subject: '', dayOfWeek: 'Monday', startTime: '10:00', link: '', recurrence: 'weekly', isActive: true
  });

  // AI Magic State (New Tab)
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null); // Store parsed result for editing
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Content Form
  const [itemForm, setItemForm] = useState({
    title: '', content: '', type: 'announcement', subject: '', 
    date: new Date().toISOString().split('T')[0],
    image: '', fileUrl: '', author: '', likes: 0, isUnread: true,
    sector: 'announcements', // Default
    // Style props
    titleColor: '#ffffff',
    titleColorEnd: '#d4d4d8', // New: End color for gradient (default light gray)
    contentColor: '#e4e4e7', // zinc-200
    fontFamily: 'sans',
    isGradient: false
  });

  const contentRef = useRef<HTMLTextAreaElement>(null);

  // --- STRUCTURE STATE ---
  const [editedSectors, setEditedSectors] = useState<Sector[]>(sectors);

  // --- CONFIG STATE ---
  const [editedConfig, setEditedConfig] = useState<GlobalConfig>(globalConfig || {
      wizardTitle: '', muggleTitle: '', wizardGateText: '', muggleGateText: '',
      wizardAlarmUrl: '', muggleAlarmUrl: '', wizardImage: '', muggleImage: '',
      wizardLogoText: 'C', muggleLogoText: 'CC', wizardLogoUrl: '', muggleLogoUrl: '',
      telegramLink: '',
      schedules: []
  });
  
  // Keep local config in sync if prop changes
  useEffect(() => {
    if (globalConfig) {
        setEditedConfig(globalConfig);
        setSchedules(globalConfig.schedules || []);
    }
  }, [globalConfig]);
  
  // Keep local sectors in sync if prop changes
  useEffect(() => {
    if (sectors.length > 0) setEditedSectors(sectors);
  }, [sectors]);

  // Keep active tab in sync with prop unless manually changed
  useEffect(() => {
      if (initialTab) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // --- USERS MANAGEMENT STATE ---
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newUser, setNewUser] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newPermissions, setNewPermissions] = useState({
      canEdit: true, canDelete: false, canManageUsers: false, canViewLogs: false, isGod: false
  });
  
  // --- AUDIT LOGS & VISITORS STATE ---
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);

  // --- FIND & REPLACE STATE ---
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [foundMatches, setFoundMatches] = useState<{itemId: string, title: string, context: 'title'|'content'}[]>([]);

  // Initialize editing if passed via prop or reset to default sector
  useEffect(() => {
    if (isOpen) {
        if (initialEditingItem) {
            startEditItem(initialEditingItem);
            setActiveTab('creator');
        } else if (!isEditingItem) {
            if (defaultSector && itemForm.sector !== defaultSector) {
                setItemForm(prev => ({ ...prev, sector: defaultSector }));
            }
        }
    }
  }, [initialEditingItem, defaultSector, isOpen]);

  const resetForm = () => {
      setItemForm({ 
        title: '', content: '', type: 'announcement', subject: '', 
        date: new Date().toISOString().split('T')[0], 
        image: '', fileUrl: '', author: currentUser || '', likes: 0, isUnread: true, 
        sector: defaultSector || 'announcements',
        titleColor: '#ffffff', titleColorEnd: '#d4d4d8', contentColor: '#e4e4e7', fontFamily: 'sans', isGradient: false
      });
      setIsEditingItem(false);
      setEditingItemId(null);
  };

  // Fetch Users & Logs when tab opens
  useEffect(() => {
    if (isAdmin) {
        if (activeTab === 'users' && permissions?.canManageUsers) fetchUsers();
        if (activeTab === 'visitors' && permissions?.canViewLogs) fetchVisitors();
    }
  }, [activeTab, isAdmin, permissions]);

  // LAZY SHORTCUT: Ctrl+Enter to Save Item
  useEffect(() => {
      const handleLazySave = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isOpen && activeTab === 'creator') {
              e.preventDefault();
              handleSaveItem();
          }
      };
      window.addEventListener('keydown', handleLazySave);
      return () => window.removeEventListener('keydown', handleLazySave);
  }, [isOpen, activeTab, itemForm]); 

  const fetchUsers = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/users`, { headers: {'x-csrf-token': csrfToken}, credentials: 'include' });
          if(res.ok) setUsers(await res.json());
      } catch(e) {}
  };

  const fetchVisitors = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/visitors`, { headers: {'x-csrf-token': csrfToken}, credentials: 'include' });
          if(res.ok) setVisitors(await res.json());
      } catch(e) {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
        credentials: 'include'
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         const text = await res.text();
         throw new Error(`Server Error: ${text.substring(0, 100)}...`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication Failed');
      onLogin(data.csrfToken, data.permissions);
      setLoginPass(''); setLoginUser('');
    } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
  };

  const startEditItem = (item: CarouselItem) => {
      if (!permissions?.canEdit) return;
      setItemForm({
          title: item.title,
          content: item.content,
          type: item.type,
          subject: item.subject || '',
          date: item.date.replace(/\./g, '-'), 
          image: item.image || '',
          fileUrl: item.fileUrl || '',
          author: item.author || '',
          likes: item.likes || 0,
          isUnread: item.isUnread || false,
          sector: item.sector || 'announcements',
          titleColor: item.style?.titleColor || '#ffffff',
          titleColorEnd: item.style?.titleColorEnd || '#d4d4d8', // Load gradient end
          contentColor: item.style?.contentColor || '#e4e4e7',
          fontFamily: item.style?.fontFamily || 'sans',
          isGradient: item.style?.isGradient || false
      });
      setEditingItemId(item.id);
      setIsEditingItem(true);
      setActiveTab('creator'); 
  };

  const insertTag = (tag: string) => {
      if (!contentRef.current) return;
      const start = contentRef.current.selectionStart;
      const end = contentRef.current.selectionEnd;
      const text = itemForm.content;
      const before = text.substring(0, start);
      const selected = text.substring(start, end);
      const after = text.substring(end);
      
      const newText = `${before}<${tag}>${selected}</${tag}>${after}`;
      setItemForm({ ...itemForm, content: newText });
      
      setTimeout(() => {
          contentRef.current?.focus();
          contentRef.current?.setSelectionRange(start + tag.length + 2, end + tag.length + 2);
      }, 0);
  };

  // --- SCHEDULER LOGIC ---
  const handleAddRule = () => {
      if (!newRule.subject || !newRule.link) return alert("Subject and Link are required");
      
      const rule: LectureRule = {
          id: crypto.randomUUID(),
          subject: newRule.subject || 'Unknown',
          dayOfWeek: newRule.dayOfWeek || 'Monday',
          startTime: newRule.startTime || '10:00',
          link: newRule.link || '#',
          recurrence: newRule.recurrence as 'weekly'|'monthly',
          isActive: true,
          endDate: newRule.endDate
      };

      const updatedSchedules = [...schedules, rule];
      setSchedules(updatedSchedules);
      
      // Persist immediately via Config Update
      if (onUpdateConfig) {
          onUpdateConfig({ ...editedConfig, schedules: updatedSchedules });
      }
      
      // Reset
      setNewRule({ ...newRule, subject: '', link: '' });
  };

  const handleDeleteRule = (id: string) => {
      const updatedSchedules = schedules.filter(s => s.id !== id);
      setSchedules(updatedSchedules);
      if (onUpdateConfig) {
          onUpdateConfig({ ...editedConfig, schedules: updatedSchedules });
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'fileUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
        alert("File too large. Serverless limit is 4MB.");
        return;
    }

    setIsUploading(true);
    
    // Convert to Base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64Str = reader.result as string;
        const base64Data = base64Str.split(',')[1]; // Remove data:image/png;base64, prefix

        try {
            const res = await fetch(`${API_URL}/api/admin/upload`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken 
                },
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type,
                    fileData: base64Data,
                    bucket: 'items'
                }),
                credentials: 'include'
            });
            
            const data = await res.json();
            if (res.ok && data.url) {
                setItemForm(prev => ({ ...prev, [field]: data.url }));
            } else {
                alert("Upload failed: " + (data.error || "Unknown Error"));
            }
        } catch (e) {
            alert("Network Error");
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = () => {
        alert("Failed to read file.");
        setIsUploading(false);
    };
  };

  // --- AI LOGIC ---
  const handleAiParse = async () => {
    const file = selectedFile || fileInputRef.current?.files?.[0];
    if (!aiPrompt && !file) {
        alert("Please provide text instructions.");
        return;
    }
    
    setAiLoading(true);
    let instructions = aiPrompt;
    if (file) {
        instructions += " [File analysis temporarily disabled in serverless mode - please paste text content instead]";
    }
    
    try {
        const res = await fetch(`${API_URL}/api/ai/parse`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken 
            },
            body: JSON.stringify({ prompt: instructions }),
            credentials: 'include'
        });
        const data = await res.json();
        
        if (res.ok) {
            const allowedTypes = ['announcement', 'file', 'video', 'task'];
            const normalizedType = data.type && allowedTypes.includes(data.type.toLowerCase()) 
                                    ? data.type.toLowerCase() 
                                    : 'announcement';
            
            setAiResult({
                title: data.title || '',
                content: data.content || '',
                date: data.date ? data.date.replace(/\./g, '-') : new Date().toISOString().split('T')[0],
                type: normalizedType,
                subject: data.subject || ''
            });
        } else {
            alert("AI Error: " + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Connection Error");
    } finally {
        setAiLoading(false);
    }
  };

  const transferAiToForm = () => {
      if (!aiResult) return;
      setItemForm(prev => ({
          ...prev,
          ...aiResult
      }));
      setActiveTab('creator');
      setAiResult(null); // Clear
      setAiPrompt('');
      setSelectedFile(null); // Clear selection
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveItem = () => {
      if (!permissions?.canEdit) {
          alert("You do not have permission to edit items.");
          return;
      }
      const formattedDate = itemForm.date.replace(/-/g, '.');
      const newItemId = crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`;
      
      const payload: CarouselItem = {
          id: isEditingItem && editingItemId ? editingItemId : newItemId, 
          title: itemForm.title,
          content: itemForm.content,
          date: formattedDate,
          type: itemForm.type as any,
          subject: itemForm.subject,
          image: itemForm.image,
          fileUrl: itemForm.fileUrl,
          author: itemForm.author || currentUser,
          likes: Number(itemForm.likes),
          isUnread: Boolean(itemForm.isUnread),
          isLiked: false,
          sector: itemForm.sector,
          style: {
              titleColor: itemForm.titleColor,
              titleColorEnd: itemForm.titleColorEnd,
              contentColor: itemForm.contentColor,
              fontFamily: itemForm.fontFamily as any,
              isGradient: itemForm.isGradient
          }
      };

      if (isEditingItem && editingItemId && onUpdateItem) {
          onUpdateItem(payload);
      } else {
          onAddItem(payload);
      }
      
      resetForm();
      setActiveTab('database'); 
  };

  // Find & Replace Logic
  const scanForMatches = () => {
      if (!findText) return;
      const matches: typeof foundMatches = [];
      allItems.forEach(item => {
          if (item.title.includes(findText)) matches.push({ itemId: item.id, title: item.title, context: 'title' });
          if (item.content.includes(findText)) matches.push({ itemId: item.id, title: item.title, context: 'content' });
      });
      setFoundMatches(matches);
  };

  const executeReplace = async (itemId: string, context: 'title'|'content') => {
      if (!permissions?.canEdit || !onUpdateItem) return;
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;

      const updatedItem = { ...item };
      if (context === 'title') updatedItem.title = updatedItem.title.split(findText).join(replaceText);
      if (context === 'content') updatedItem.content = updatedItem.content.split(findText).join(replaceText);

      await onUpdateItem(updatedItem);
      setFoundMatches(prev => prev.filter(p => !(p.itemId === itemId && p.context === context)));
  };

  const executeReplaceAll = async () => {
      if (!confirm(`Replace all ${foundMatches.length} occurrences? This might take a moment.`)) return;
      
      const affectedItems = new Set(foundMatches.map(m => m.itemId));
      
      for (const id of affectedItems) {
          const item = allItems.find(i => i.id === id);
          if (!item) continue;
          
          let newTitle = item.title;
          let newContent = item.content;
          
          if (foundMatches.some(m => m.itemId === id && m.context === 'title')) {
              newTitle = newTitle.split(findText).join(replaceText);
          }
          if (foundMatches.some(m => m.itemId === id && m.context === 'content')) {
              newContent = newContent.split(findText).join(replaceText);
          }
          
          if (newTitle !== item.title || newContent !== item.content) {
             if (onUpdateItem) await onUpdateItem({ ...item, title: newTitle, content: newContent });
          }
      }
      setFoundMatches([]);
      alert("Replacement complete.");
  };

  const handleCreateUser = async () => { 
      if (!permissions?.canManageUsers) return;
      try {
          const res = await fetch(`${API_URL}/api/admin/users/add`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
              body: JSON.stringify({ username: newUser, password: newUserPass, permissions: newPermissions }),
              credentials: 'include'
          });
          if(res.ok) {
              setNewUser(''); setNewUserPass(''); fetchUsers();
          } else {
              alert("Failed to create user.");
          }
      } catch(e) {}
  };
  const handleDeleteUser = async (targetUser: string) => {
      if(!confirm("Delete this user?")) return;
      try {
          const res = await fetch(`${API_URL}/api/admin/users/delete`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
              body: JSON.stringify({ targetUser }),
              credentials: 'include'
          });
          if(res.ok) fetchUsers();
      } catch(e) {}
  };
  
  const handleSaveSectors = () => {
    if (onUpdateSectors) {
        onUpdateSectors(editedSectors);
        alert("Sectors updated successfully.");
    }
  };

  const handleUpdateSector = (index: number, field: keyof Sector, value: string) => {
      const updated = [...editedSectors];
      updated[index] = { ...updated[index], [field]: value };
      setEditedSectors(updated);
  };

  const handleSaveConfig = () => {
    if (onUpdateConfig) {
        onUpdateConfig(editedConfig);
        alert("Global configuration updated successfully.");
    }
  };

  const filteredItems = useMemo(() => {
    return allItems.filter(i => {
      const matchesSearch = i.title.toLowerCase().includes(itemSearch.toLowerCase()) || 
                            i.content.toLowerCase().includes(itemSearch.toLowerCase());
      const matchesType = typeFilter === 'all' || i.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [allItems, itemSearch, typeFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-2 sm:p-4 animate-[fade-in_0.2s_ease-out]">
      <div className={`w-full max-w-6xl rounded-xl border shadow-2xl overflow-hidden flex flex-col relative h-[100dvh] sm:h-full sm:max-h-[95vh] text-zinc-200 transition-colors duration-500
        ${isWizard ? 'bg-[#0a0505] border-red-900/50 shadow-red-900/30' : 'bg-[#050510] border-blue-900/50 shadow-blue-900/30'}
      `}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white z-30 p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>

        {isAdmin && (
            <div className={`p-4 sm:p-6 border-b flex items-center gap-4 shrink-0 z-20 relative
                ${isWizard ? 'border-red-900/50 bg-[#0a0505]' : 'border-blue-900/50 bg-[#050510]'} 
            `}>
            <Unlock size={32} className={isWizard ? "text-red-500 shrink-0" : "text-blue-500 shrink-0"} />
            <div className="min-w-0 flex-1 pr-12">
                <h2 className={`text-xl sm:text-2xl font-bold truncate ${isWizard ? 'font-wizardTitle text-red-100' : 'font-muggle text-blue-100'}`}>
                {permissions?.isGod ? 'GOD MODE ACCESS' : `ADMIN: ${currentUser.toUpperCase()}`}
                </h2>
                <p className={`text-xs uppercase tracking-widest opacity-70 truncate ${isWizard ? 'font-wizard text-red-300' : 'font-muggle text-blue-300'}`}>
                Modify Everything. Control Reality.
                </p>
            </div>
            </div>
        )}

        {!isAdmin ? (
          <div className="flex-1 flex items-center justify-center p-6 w-full relative overflow-hidden h-full">
             <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {isWizard ? (
                    <>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-900/10 blur-[100px] rounded-full animate-pulse-slow"></div>
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30"></div>
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
                    </>
                )}
             </div>

             <div className="z-10 w-full max-w-sm">
                <form onSubmit={handleLogin} className={`p-8 rounded-2xl border backdrop-blur-xl shadow-2xl
                    ${isWizard ? 'bg-black/80 border-red-900/50' : 'bg-black/80 border-blue-900/50'}
                `}>
                    <div className="text-center mb-8">
                        <Lock size={48} className={`mx-auto mb-4 ${isWizard ? 'text-red-500' : 'text-blue-500'}`} />
                        <h2 className="text-2xl font-bold text-white mb-2">Restricted Area</h2>
                        <p className="text-sm opacity-60">Credentials Required</p>
                    </div>

                    <div className="space-y-4">
                        <input 
                            type="text" 
                            value={loginUser}
                            onChange={(e) => setLoginUser(e.target.value)}
                            placeholder="Username"
                            className="w-full bg-white/5 border border-white/10 rounded p-3 text-white outline-none focus:border-white/30 transition-colors"
                        />
                        <input 
                            type="password" 
                            value={loginPass}
                            onChange={(e) => setLoginPass(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-white/5 border border-white/10 rounded p-3 text-white outline-none focus:border-white/30 transition-colors"
                        />
                        {error && <div className="text-red-500 text-xs text-center">{error}</div>}
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={`w-full py-3 rounded font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2
                                ${isWizard ? 'bg-red-900 text-red-100 hover:bg-red-800' : 'bg-blue-900 text-blue-100 hover:bg-blue-800'}
                            `}
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'AUTHENTICATE'}
                        </button>
                    </div>
                </form>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
            {/* Sidebar Navigation */}
            <nav className={`sm:w-64 shrink-0 overflow-y-auto border-b sm:border-b-0 sm:border-r flex sm:flex-col
                ${isWizard ? 'bg-red-950/10 border-red-900/30' : 'bg-blue-950/10 border-blue-900/30'}
            `}>
                <div className="p-2 sm:p-4 flex sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible">
                    {[
                        { id: 'database', icon: Database, label: 'Database' },
                        { id: 'creator', icon: PenTool, label: 'Creator' },
                        { id: 'scheduler', icon: CalendarDays, label: 'Scheduler' },
                        { id: 'ai-lab', icon: BrainCircuit, label: 'AI Magic' },
                        { id: 'visitors', icon: ScanFace, label: 'Visitors' },
                        { id: 'users', icon: Users, label: 'Admins' },
                        { id: 'config', icon: Settings, label: 'Config' },
                        { id: 'structure', icon: LayoutTemplate, label: 'Sectors' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`p-3 rounded-lg flex items-center gap-3 transition-all whitespace-nowrap
                                ${activeTab === tab.id 
                                    ? (isWizard ? 'bg-red-900/30 text-red-100' : 'bg-blue-900/30 text-blue-100') 
                                    : 'opacity-50 hover:opacity-100 hover:bg-white/5'}
                            `}
                        >
                            <tab.icon size={18} />
                            <span className="font-bold text-sm">{tab.label}</span>
                        </button>
                    ))}
                    
                    <button onClick={onLogout} className="mt-auto p-3 rounded-lg flex items-center gap-3 text-red-400 opacity-50 hover:opacity-100 hover:bg-red-900/20">
                        <Lock size={18} />
                        <span className="font-bold text-sm">Logout</span>
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-8 relative custom-scrollbar">
                
                {/* DATABASE TAB */}
                {activeTab === 'database' && (
                    <div className="space-y-6">
                        <div className="flex gap-4 mb-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16}/>
                                <input 
                                    type="text" 
                                    placeholder="Search DB..." 
                                    value={itemSearch}
                                    onChange={(e) => setItemSearch(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded pl-10 p-2 text-white outline-none focus:border-white/30"
                                />
                            </div>
                            <select 
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded px-4 text-white outline-none"
                            >
                                <option value="all" className="bg-black">All Types</option>
                                <option value="announcement" className="bg-black">News</option>
                                <option value="file" className="bg-black">Files</option>
                                <option value="video" className="bg-black">Videos</option>
                                <option value="task" className="bg-black">Tasks</option>
                            </select>
                        </div>

                        {/* Find & Replace Tool */}
                        <div className="p-4 rounded border border-white/10 bg-white/5 mb-6">
                            <h4 className="text-xs font-bold uppercase opacity-50 mb-3 flex items-center gap-2"><Replace size={14}/> Batch Operation</h4>
                            <div className="flex gap-2">
                                <input value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find..." className="bg-black/20 p-2 rounded text-xs text-white border border-white/10 flex-1"/>
                                <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace with..." className="bg-black/20 p-2 rounded text-xs text-white border border-white/10 flex-1"/>
                                <button onClick={scanForMatches} className="px-3 py-1 bg-blue-600 rounded text-xs font-bold hover:bg-blue-500">SCAN</button>
                            </div>
                            {foundMatches.length > 0 && (
                                <div className="mt-2 text-xs flex justify-between items-center">
                                    <span className="text-yellow-400">Found {foundMatches.length} matches.</span>
                                    <button onClick={executeReplaceAll} className="px-3 py-1 bg-red-600 rounded font-bold hover:bg-red-500">REPLACE ALL</button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {filteredItems.map(item => (
                                <div key={item.id} className="p-3 rounded bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-2 h-10 rounded-full ${item.isUnread ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                                        <div className="min-w-0">
                                            <div className="font-bold truncate text-sm text-white">{item.title}</div>
                                            <div className="text-xs opacity-50 flex gap-2">
                                                <span>{item.date}</span>
                                                <span>•</span>
                                                <span className="uppercase">{item.type}</span>
                                                <span>•</span>
                                                <span>{item.sector}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditItem(item)} className="p-2 bg-blue-600 rounded text-white hover:bg-blue-500"><Edit3 size={14}/></button>
                                        <button onClick={() => { if(confirm('Delete?')) onDeleteItem && onDeleteItem(item.id) }} className="p-2 bg-red-600 rounded text-white hover:bg-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CREATOR TAB */}
                {activeTab === 'creator' && (
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <PenTool size={20} /> {isEditingItem ? 'Edit Item' : 'New Creation'}
                            </h3>
                            {isEditingItem && (
                                <button onClick={resetForm} className="text-xs text-red-400 hover:text-red-300">Cancel Edit</button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                value={itemForm.title} onChange={e => setItemForm({...itemForm, title: e.target.value})} 
                                placeholder="Title" className="col-span-2 p-3 bg-white/5 border border-white/10 rounded text-white outline-none focus:border-blue-500"
                            />
                            <select value={itemForm.type} onChange={e => setItemForm({...itemForm, type: e.target.value as any})} className="p-3 bg-white/5 border border-white/10 rounded text-white outline-none">
                                <option value="announcement" className="bg-black">Announcement</option>
                                <option value="file" className="bg-black">File (PDF/Doc)</option>
                                <option value="video" className="bg-black">Video</option>
                                <option value="task" className="bg-black">Task</option>
                            </select>
                            <select value={itemForm.sector} onChange={e => setItemForm({...itemForm, sector: e.target.value})} className="p-3 bg-white/5 border border-white/10 rounded text-white outline-none">
                                {sectors.map(s => <option key={s.id} value={s.id} className="bg-black">{isWizard ? s.wizardName : s.muggleName}</option>)}
                            </select>
                            <input type="date" value={itemForm.date} onChange={e => setItemForm({...itemForm, date: e.target.value})} className="p-3 bg-white/5 border border-white/10 rounded text-white outline-none" />
                            <input value={itemForm.subject} onChange={e => setItemForm({...itemForm, subject: e.target.value})} placeholder="Subject / Tag" className="p-3 bg-white/5 border border-white/10 rounded text-white outline-none" />
                        </div>

                        <div className="p-4 rounded border border-white/10 bg-white/5">
                            <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                                {['b','i','u','h1','code','quote'].map(tag => (
                                    <button key={tag} onClick={() => insertTag(tag)} className="px-3 py-1 bg-black/40 rounded text-xs font-mono hover:bg-black/60">&lt;{tag}&gt;</button>
                                ))}
                            </div>
                            <textarea 
                                ref={contentRef}
                                value={itemForm.content} onChange={e => setItemForm({...itemForm, content: e.target.value})} 
                                placeholder="Content (HTML supported)..." 
                                className="w-full h-64 bg-transparent outline-none text-sm font-mono text-zinc-300 resize-none"
                            />
                        </div>

                        {/* Media & Style */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase opacity-50">Media</h4>
                                <div className="space-y-2">
                                    <label className="block text-xs">Cover Image</label>
                                    <div className="flex gap-2">
                                        <input value={itemForm.image} onChange={e => setItemForm({...itemForm, image: e.target.value})} placeholder="https://..." className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"/>
                                        <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20">
                                            <Upload size={14}/>
                                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'image')}/>
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs">File/Video URL</label>
                                    <div className="flex gap-2">
                                        <input value={itemForm.fileUrl} onChange={e => setItemForm({...itemForm, fileUrl: e.target.value})} placeholder="https://..." className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"/>
                                        <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20">
                                            <Upload size={14}/>
                                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'fileUrl')}/>
                                        </label>
                                    </div>
                                </div>
                                {isUploading && <div className="text-xs text-blue-400 animate-pulse">Uploading to Cloud...</div>}
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase opacity-50">Style Override</h4>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={itemForm.titleColor} onChange={e => setItemForm({...itemForm, titleColor: e.target.value})} className="h-8 w-8 bg-transparent border-0 cursor-pointer"/>
                                    <span className="text-xs">Title Color</span>
                                    {itemForm.isGradient && (
                                         <input type="color" value={itemForm.titleColorEnd} onChange={e => setItemForm({...itemForm, titleColorEnd: e.target.value})} className="h-8 w-8 bg-transparent border-0 cursor-pointer"/>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                     <input type="checkbox" checked={itemForm.isGradient} onChange={e => setItemForm({...itemForm, isGradient: e.target.checked})} />
                                     <span className="text-xs">Gradient Title</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={itemForm.contentColor} onChange={e => setItemForm({...itemForm, contentColor: e.target.value})} className="h-8 w-8 bg-transparent border-0 cursor-pointer"/>
                                    <span className="text-xs">Content Color</span>
                                </div>
                                <select value={itemForm.fontFamily} onChange={e => setItemForm({...itemForm, fontFamily: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-xs">
                                    <option value="sans" className="bg-black">Sans Serif (Default)</option>
                                    <option value="wizard" className="bg-black">Wizard Serif</option>
                                    <option value="muggle" className="bg-black">Muggle Mono</option>
                                </select>
                            </div>
                        </div>

                        <button onClick={handleSaveItem} className="w-full py-4 bg-green-600 hover:bg-green-500 rounded font-bold text-lg shadow-lg transition-transform active:scale-95">
                            {isEditingItem ? 'UPDATE ITEM' : 'PUBLISH ITEM'}
                        </button>
                    </div>
                )}

                {/* SCHEDULER TAB */}
                {activeTab === 'scheduler' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="text-xl font-bold flex items-center gap-2"><CalendarDays size={20}/> Lecture Schedule</h3>
                             <div className="text-xs opacity-50">Auto-publishes to "Owl Post Schedule"</div>
                        </div>

                        {/* Add Rule Form */}
                        <div className="p-4 rounded border border-white/10 bg-white/5 flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs mb-1 opacity-70">Subject</label>
                                <input value={newRule.subject} onChange={e => setNewRule({...newRule, subject: e.target.value})} placeholder="e.g. Potions 101" className="w-full p-2 rounded bg-black/20 border border-white/10 text-sm"/>
                            </div>
                            <div className="w-32">
                                <label className="block text-xs mb-1 opacity-70">Day</label>
                                <select value={newRule.dayOfWeek} onChange={e => setNewRule({...newRule, dayOfWeek: e.target.value})} className="w-full p-2 rounded bg-black/20 border border-white/10 text-sm">
                                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d} className="bg-black">{d}</option>)}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-xs mb-1 opacity-70">Time</label>
                                <input type="time" value={newRule.startTime} onChange={e => setNewRule({...newRule, startTime: e.target.value})} className="w-full p-2 rounded bg-black/20 border border-white/10 text-sm"/>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs mb-1 opacity-70">Join Link</label>
                                <input value={newRule.link} onChange={e => setNewRule({...newRule, link: e.target.value})} placeholder="https://zoom.us/..." className="w-full p-2 rounded bg-black/20 border border-white/10 text-sm"/>
                            </div>
                            <button onClick={handleAddRule} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold text-sm h-[38px]">ADD</button>
                        </div>

                        {/* Schedule List */}
                        <div className="space-y-2">
                            {schedules.map((rule, i) => (
                                <div key={rule.id} className="p-3 rounded bg-white/5 border border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${rule.isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                            <Repeat size={16}/>
                                        </div>
                                        <div>
                                            <div className="font-bold">{rule.subject}</div>
                                            <div className="text-xs opacity-50">{rule.dayOfWeek}s at {rule.startTime} • {rule.recurrence}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a href={rule.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs truncate max-w-[150px]">{rule.link}</a>
                                        <button onClick={() => handleDeleteRule(rule.id)} className="p-2 hover:bg-red-900/30 rounded text-red-400"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                            {schedules.length === 0 && <div className="text-center opacity-40 py-8">No active schedules.</div>}
                        </div>
                    </div>
                )}

                {/* AI LAB TAB */}
                {activeTab === 'ai-lab' && (
                    <div className="max-w-2xl mx-auto space-y-6 text-center">
                        <BrainCircuit size={48} className={`mx-auto mb-4 ${isWizard ? 'text-purple-500' : 'text-blue-500'}`} />
                        <h3 className="text-xl font-bold">The Oracle's Parser</h3>
                        <p className="opacity-60 text-sm">Upload a document or paste raw text. The AI will format it into a structured item.</p>

                        <textarea 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Paste raw text here or describe what you want..."
                            className="w-full h-32 p-4 rounded bg-white/5 border border-white/10 outline-none focus:border-purple-500 transition-colors"
                        />
                        
                        <div className="flex justify-center">
                            <label className="px-4 py-2 bg-white/10 rounded cursor-pointer hover:bg-white/20 flex items-center gap-2">
                                <Upload size={16}/>
                                <span>{selectedFile ? selectedFile.name : "Select File (Optional)"}</span>
                                <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}/>
                            </label>
                        </div>

                        <button 
                            onClick={handleAiParse}
                            disabled={aiLoading}
                            className={`px-8 py-3 rounded-full font-bold text-white transition-all hover:scale-105 ${isWizard ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                        >
                            {aiLoading ? <Loader2 className="animate-spin"/> : "ANALYZE & GENERATE"}
                        </button>

                        {aiResult && (
                            <div className="mt-8 p-6 rounded bg-green-900/20 border border-green-500/30 text-left animate-[fade-in_0.5s]">
                                <h4 className="font-bold text-green-400 mb-2 flex items-center gap-2"><CheckCircle size={16}/> Result Ready</h4>
                                <pre className="text-xs overflow-x-auto bg-black/40 p-2 rounded mb-4">{JSON.stringify(aiResult, null, 2)}</pre>
                                <button onClick={transferAiToForm} className="w-full py-2 bg-green-600 hover:bg-green-500 rounded font-bold">USE THIS DATA</button>
                            </div>
                        )}
                    </div>
                )}

                {/* USERS TAB */}
                {activeTab === 'users' && permissions?.canManageUsers && (
                    <div className="space-y-8">
                        {/* User List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {users.map(u => (
                                <div key={u.username} className="p-4 rounded bg-white/5 border border-white/10 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${u.role === 'god' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                            <UserIcon role={u.permissions?.isGod ? 'god' : 'admin'} />
                                        </div>
                                        <div>
                                            <div className="font-bold">{u.username}</div>
                                            <div className="text-xs opacity-50">Last Active: {new Date(u.lastActive).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    {!u.permissions?.isGod && (
                                        <button onClick={() => handleDeleteUser(u.username)} className="text-red-500 hover:text-red-400 p-2"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add User Form */}
                        <div className="p-6 rounded border border-white/10 bg-white/5">
                            <h4 className="font-bold mb-4 flex items-center gap-2"><Plus size={16}/> Add New Admin</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="Username" className="p-2 bg-black/20 border border-white/10 rounded"/>
                                <input value={newUserPass} onChange={e => setNewUserPass(e.target.value)} type="password" placeholder="Password" className="p-2 bg-black/20 border border-white/10 rounded"/>
                            </div>
                            <div className="flex gap-4 mb-4 text-sm">
                                <label className="flex items-center gap-2"><input type="checkbox" checked={newPermissions.canEdit} onChange={e => setNewPermissions({...newPermissions, canEdit: e.target.checked})}/> Can Edit</label>
                                <label className="flex items-center gap-2"><input type="checkbox" checked={newPermissions.canDelete} onChange={e => setNewPermissions({...newPermissions, canDelete: e.target.checked})}/> Can Delete</label>
                                <label className="flex items-center gap-2"><input type="checkbox" checked={newPermissions.canViewLogs} onChange={e => setNewPermissions({...newPermissions, canViewLogs: e.target.checked})}/> View Logs</label>
                                {permissions?.isGod && (
                                    <label className="flex items-center gap-2 text-yellow-400"><input type="checkbox" checked={newPermissions.isGod} onChange={e => setNewPermissions({...newPermissions, isGod: e.target.checked})}/> God Mode</label>
                                )}
                            </div>
                            <button onClick={handleCreateUser} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold">CREATE USER</button>
                        </div>
                    </div>
                )}

                {/* CONFIG TAB */}
                {activeTab === 'config' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="p-4 rounded border border-yellow-500/30 bg-yellow-900/10 text-yellow-200 text-sm">
                            <Info size={16} className="inline mr-2"/>
                            Changes here affect the global application state for ALL users immediately.
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold opacity-70 border-b border-white/10 pb-2">Branding</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs mb-1 opacity-50">Wizard Title</label>
                                    <input value={editedConfig.wizardTitle} onChange={e => setEditedConfig({...editedConfig, wizardTitle: e.target.value})} className="w-full p-2 bg-white/5 border border-white/10 rounded text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-xs mb-1 opacity-50">Muggle Title</label>
                                    <input value={editedConfig.muggleTitle} onChange={e => setEditedConfig({...editedConfig, muggleTitle: e.target.value})} className="w-full p-2 bg-white/5 border border-white/10 rounded text-sm"/>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold opacity-70 border-b border-white/10 pb-2">Backgrounds (URL)</h4>
                            <div className="grid grid-cols-1 gap-4">
                                <input value={editedConfig.wizardImage} onChange={e => setEditedConfig({...editedConfig, wizardImage: e.target.value})} placeholder="Wizard BG URL" className="w-full p-2 bg-white/5 border border-white/10 rounded text-sm"/>
                                <input value={editedConfig.muggleImage} onChange={e => setEditedConfig({...editedConfig, muggleImage: e.target.value})} placeholder="Muggle BG URL" className="w-full p-2 bg-white/5 border border-white/10 rounded text-sm"/>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold opacity-70 border-b border-white/10 pb-2 flex items-center gap-2"><Send size={16} /> Telegram Integration</h4>
                            <div className="grid grid-cols-1 gap-4">
                                <input value={editedConfig.telegramLink || ''} onChange={e => setEditedConfig({...editedConfig, telegramLink: e.target.value})} placeholder="https://t.me/your_channel" className="w-full p-2 bg-white/5 border border-white/10 rounded text-sm"/>
                                <p className="text-[10px] opacity-50">Enter the full invite link (e.g. https://t.me/joinchat/...) to show the icon in the user header.</p>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button onClick={handleSaveConfig} className="w-full py-3 bg-red-600 hover:bg-red-500 rounded font-bold shadow-lg">
                                DEPLOY CONFIGURATION
                            </button>
                        </div>
                    </div>
                )}
                
                {/* VISITORS TAB */}
                {activeTab === 'visitors' && permissions?.canViewLogs && (
                    <div className="overflow-x-auto rounded border border-white/10">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-3">Visitor</th>
                                    <th className="p-3">Last Active</th>
                                    <th className="p-3">Visits</th>
                                    <th className="p-3">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visitors.map(v => (
                                    <tr key={v.visitor_id} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="p-3 font-bold flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            {v.display_name}
                                        </td>
                                        <td className="p-3 opacity-70">{new Date(v.last_active).toLocaleString()}</td>
                                        <td className="p-3">{v.visit_count}</td>
                                        <td className="p-3">{(v.total_time_spent / 60).toFixed(1)}m</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* STRUCTURE TAB (Sectors) */}
                {activeTab === 'structure' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Sector Configuration</h3>
                            <button onClick={handleSaveSectors} className="px-4 py-2 bg-green-600 rounded font-bold hover:bg-green-500">Save Layout</button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {editedSectors.map((sector, idx) => (
                                <div key={sector.id} className="p-4 rounded bg-white/5 border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-1 md:col-span-2 text-xs font-bold opacity-50 uppercase tracking-widest border-b border-white/5 pb-1 mb-1">
                                        Sector ID: {sector.id}
                                    </div>
                                    <div>
                                        <label className="text-xs opacity-50 block mb-1">Wizard Name</label>
                                        <input value={sector.wizardName} onChange={e => handleUpdateSector(idx, 'wizardName', e.target.value)} className="w-full p-2 bg-black/20 rounded border border-white/10 text-sm"/>
                                    </div>
                                    <div>
                                        <label className="text-xs opacity-50 block mb-1">Muggle Name</label>
                                        <input value={sector.muggleName} onChange={e => handleUpdateSector(idx, 'muggleName', e.target.value)} className="w-full p-2 bg-black/20 rounded border border-white/10 text-sm"/>
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs opacity-50 block mb-1">Description</label>
                                        <input value={sector.description} onChange={e => handleUpdateSector(idx, 'description', e.target.value)} className="w-full p-2 bg-black/20 rounded border border-white/10 text-sm"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </main>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Icon
const UserIcon = ({ role }: { role: 'god' | 'admin' }) => {
    return role === 'god' ? <ShieldAlert size={20}/> : <Shield size={20}/>;
};

export default AdminPanel;
