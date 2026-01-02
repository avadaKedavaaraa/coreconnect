
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lineage, type CarouselItem, type Sector, type AdminUser, type AuditLog, SECTORS } from '../types';
import { type GlobalConfig, API_URL } from '../App';
import { 
    ShieldAlert, Lock, Unlock, Plus, Image as ImageIcon, X, Trash2, Calendar, 
    Tag, Layers, Upload, FileUp, Loader2, Edit3, Save, Users, Settings, Volume2, Play,
    Search, HelpCircle, Info, Filter, Eye, Terminal, KeyRound, CheckCircle, Shield, Ban,
    Bold, Italic, Underline, Palette, Type, Database, Sparkles, Wand2, Wrench, Replace,
    ChevronDown, ChevronUp, RefreshCw, PenTool, LayoutTemplate, FileText, Video, ScrollText,
    BrainCircuit, FileCheck, ArrowRight, ScanFace, Fingerprint, Hexagon, FileIcon, MessageSquare
} from 'lucide-react';
import DOMPurify from 'dompurify';

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
  lineage, isOpen, onClose, isAdmin, csrfToken, onLogin, onLogout, currentUser, permissions,
  onAddItem, onUpdateItem, onDeleteItem, onUpdateSectors, onUpdateConfig, allItems = [], sectors = [], globalConfig, onClearData, initialEditingItem, defaultSector
}) => {
  const isWizard = lineage === Lineage.WIZARD;
  const [activeTab, setActiveTab] = useState<'creator' | 'ai-lab' | 'database' | 'structure' | 'users' | 'config' | 'tools'>('database');
  
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
  
  // Subject Combobox State
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  
  // AI Magic State (New Tab)
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null); // Store parsed result for editing
  const [aiOptions, setAiOptions] = useState({ summarize: false });
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
      wizardLogoText: 'C', muggleLogoText: 'CC', wizardLogoUrl: '', muggleLogoUrl: ''
  });
  
  // Keep local config in sync if prop changes
  useEffect(() => {
    if (globalConfig) setEditedConfig(globalConfig);
  }, [globalConfig]);
  
  // Keep local sectors in sync if prop changes
  useEffect(() => {
    if (sectors.length > 0) setEditedSectors(sectors);
  }, [sectors]);

  // --- SECURITY / PASSWORD CHANGE STATE ---
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');

  // --- USERS MANAGEMENT STATE ---
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newUser, setNewUser] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newPermissions, setNewPermissions] = useState({
      canEdit: true, canDelete: false, canManageUsers: false, canViewLogs: false, isGod: false
  });
  
  // --- AUDIT LOGS STATE ---
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [viewingLogsFor, setViewingLogsFor] = useState<string | null>(null);

  // --- FIND & REPLACE STATE ---
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [foundMatches, setFoundMatches] = useState<{itemId: string, title: string, context: 'title'|'content'}[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  // Initialize editing if passed via prop or reset to default sector
  useEffect(() => {
    if (isOpen) {
        if (initialEditingItem) {
            startEditItem(initialEditingItem);
            setActiveTab('creator');
        } else if (!isEditingItem) {
            if (defaultSector && itemForm.sector !== defaultSector) {
                setItemForm(prev => ({ ...prev, sector: defaultSector }));
                // If we open admin specifically, and we are not editing, jump to creator to make adding easy
                setActiveTab('creator');
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
        titleColor: '#ffffff', contentColor: '#e4e4e7', fontFamily: 'sans', isGradient: false
      });
      setIsEditingItem(false);
      setEditingItemId(null);
  };

  // Fetch Users & Logs when tab opens
  useEffect(() => {
    if (activeTab === 'users' && isAdmin && permissions?.canManageUsers) {
        fetchUsers();
    }
  }, [activeTab, isAdmin, permissions]);

  const fetchUsers = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/users`, { headers: {'x-csrf-token': csrfToken}, credentials: 'include' });
          if(res.ok) setUsers(await res.json());
      } catch(e) {}
  };

  const fetchLogs = async (targetUser?: string) => {
      try {
          const url = targetUser 
            ? `${API_URL}/api/admin/logs?targetUser=${targetUser}` 
            : `${API_URL}/api/admin/logs`;
          const res = await fetch(url, { headers: {'x-csrf-token': csrfToken}, credentials: 'include' });
          if(res.ok) setAuditLogs(await res.json());
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

  const handleChangePassword = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/change-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
              body: JSON.stringify({ currentPassword: currPass, newPassword: newPass }),
              credentials: 'include'
          });
          if(res.ok) {
              setPassMsg("Password updated successfully.");
              setCurrPass(''); setNewPass('');
          } else {
              const d = await res.json();
              setPassMsg(`Error: ${d.error}`);
          }
      } catch(e) { setPassMsg("Connection error."); }
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
          contentColor: item.style?.contentColor || '#e4e4e7',
          fontFamily: item.style?.fontFamily || 'sans',
          isGradient: item.style?.isGradient || false
      });
      setEditingItemId(item.id);
      setIsEditingItem(true);
      setActiveTab('creator'); // Switch to creator tab
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
    
    // For Serverless stability, we only send text prompts right now.
    // File uploads to AI via Vercel require edge handling or external storage first.
    // Simplification:
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
      // Fix: Ensure we don't accidentally send null/undefined IDs or reuse 'custom-' for DB saves unless handled by backend
      const newItemId = crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`;
      
      const payload: CarouselItem = {
          id: isEditingItem && editingItemId ? editingItemId : newItemId, // Ensure unique ID for new items
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
      setActiveTab('database'); // Go to list to confirm
      alert(isEditingItem ? "Item Updated" : "Item Created Successfully");
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
      setHasScanned(true);
  };

  const executeReplace = async (itemId: string, context: 'title'|'content') => {
      if (!permissions?.canEdit || !onUpdateItem) return;
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;

      const updatedItem = { ...item };
      // Compatibility fix: use split/join instead of replaceAll
      if (context === 'title') updatedItem.title = updatedItem.title.split(findText).join(replaceText);
      if (context === 'content') updatedItem.content = updatedItem.content.split(findText).join(replaceText);

      await onUpdateItem(updatedItem);
      
      // Update local match list
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
      setHasScanned(false);
      alert("Replacement complete.");
  };

  // ... (Other handlers)
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
  const handleBlockUser = async (targetUser: string) => { /* Not implemented in API yet */ };
  
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

  // Filter items for the list
  const filteredItems = useMemo(() => {
    return allItems.filter(i => {
      const matchesSearch = i.title.toLowerCase().includes(itemSearch.toLowerCase()) || 
                            i.content.toLowerCase().includes(itemSearch.toLowerCase());
      const matchesType = typeFilter === 'all' || i.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [allItems, itemSearch, typeFilter]);
  
  // Extract unique subjects for datalist
  const uniqueSubjects = useMemo(() => {
      const s = new Set<string>();
      allItems.forEach(i => { if(i.subject) s.add(i.subject); });
      return Array.from(s).sort();
  }, [allItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-2 sm:p-4 animate-[fade-in_0.2s_ease-out]">
      <div className={`w-full max-w-6xl rounded-xl border shadow-2xl overflow-hidden flex flex-col relative h-full max-h-[95vh] text-zinc-200 transition-colors duration-500
        ${isWizard ? 'bg-[#0a0505] border-red-900/50 shadow-red-900/30' : 'bg-[#050510] border-blue-900/50 shadow-blue-900/30'}
      `}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white z-30 p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>

        {/* Header - Only visible when logged in */}
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
          // LOGIN FORM - ENHANCED & ANIMATED
          <div className="flex-1 flex items-center justify-center p-6 w-full relative overflow-hidden h-full">
             
             {/* Animated Background Effects */}
             <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {isWizard ? (
                    <>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-red-900/30 animate-[spin_20s_linear_infinite] opacity-50"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border-2 border-dashed border-red-800/40 animate-[spin_15s_linear_infinite_reverse] opacity-60"></div>
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(127,29,29,0.1),transparent_70%)]"></div>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="absolute w-2 h-2 bg-red-600 rounded-full animate-firefly opacity-0" style={{
                                top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                                animationDelay: `${i * 2}s`, animationDuration: `${10 + Math.random() * 5}s`
                            }}></div>
                        ))}
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20"></div>
                        <div className="absolute top-0 w-full h-2 bg-blue-500/50 blur-[20px] animate-[scanline_3s_linear_infinite]"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-blue-900/30 rounded-full opacity-30 animate-pulse"></div>
                    </>
                )}
             </div>

             <form onSubmit={handleLogin} className={`w-full max-w-md p-10 rounded-2xl border backdrop-blur-2xl shadow-2xl relative z-10 transition-all duration-700
                ${isWizard 
                    ? 'bg-[#1a0505]/80 border-red-900/60 shadow-[0_0_50px_rgba(153,27,27,0.3)] hover:border-red-600/60' 
                    : 'bg-[#050a1a]/80 border-blue-900/60 shadow-[0_0_50px_rgba(30,58,138,0.3)] hover:border-blue-600/60'}
             `}>
               {/* Login Header */}
               <div className="text-center mb-10 relative">
                  <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 border-4 shadow-[0_0_30px_inset] transition-all duration-500 relative overflow-hidden group
                     ${isWizard 
                        ? 'bg-black border-red-800 text-red-500 shadow-red-900/50 group-hover:border-red-500 group-hover:shadow-[0_0_50px_rgba(220,38,38,0.5)]' 
                        : 'bg-black border-blue-800 text-blue-500 shadow-blue-900/50 group-hover:border-blue-500 group-hover:shadow-[0_0_50px_rgba(37,99,235,0.5)]'}
                  `}>
                      <div className={`absolute inset-0 opacity-20 animate-spin-slow ${isWizard ? 'bg-[url("https://www.transparenttextures.com/patterns/black-scales.png")]' : 'bg-[url("https://www.transparenttextures.com/patterns/diagmonds-light.png")]'}`}></div>
                      {isWizard ? <Eye size={40} className="animate-pulse" /> : <ScanFace size={40} className="animate-pulse" />}
                  </div>
                  <h3 className={`font-bold text-2xl tracking-[0.2em] mb-1 ${isWizard ? 'text-red-100 font-wizardTitle' : 'text-blue-100 font-muggle'}`}>
                    {isWizard ? 'SANCTUM ACCESS' : 'ROOT ACCESS'}
                  </h3>
                  <p className={`text-[10px] uppercase tracking-widest opacity-60 ${isWizard ? 'text-red-300' : 'text-blue-300'}`}>
                    {isWizard ? 'Speak Friend and Enter' : 'Authentication Required'}
                  </p>
               </div>
               
               <div className="space-y-6">
                   <div className="relative group">
                       <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${isWizard ? 'text-red-700 group-focus-within:text-red-400' : 'text-blue-700 group-focus-within:text-blue-400'}`}>
                           {isWizard ? <Wand2 size={18}/> : <Terminal size={18}/>}
                       </div>
                       <input 
                         type="text" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} 
                         placeholder={isWizard ? "Incantation (Username)" : "Identity"}
                         className={`w-full pl-10 pr-4 py-4 rounded-lg border bg-black/60 text-white placeholder:text-white/20 outline-none transition-all duration-300
                            ${isWizard 
                                ? 'border-red-900/50 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.2)] font-wizard tracking-wider' 
                                : 'border-blue-900/50 focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)] font-muggle text-sm'}
                         `}
                       />
                   </div>
                   <div className="relative group">
                       <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${isWizard ? 'text-red-700 group-focus-within:text-red-400' : 'text-blue-700 group-focus-within:text-blue-400'}`}>
                           {isWizard ? <KeyRound size={18}/> : <Fingerprint size={18}/>}
                       </div>
                       <input 
                         type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} 
                         placeholder={isWizard ? "Sigil (Password)" : "Passcode"}
                         className={`w-full pl-10 pr-4 py-4 rounded-lg border bg-black/60 text-white placeholder:text-white/20 outline-none transition-all duration-300
                            ${isWizard 
                                ? 'border-red-900/50 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.2)] font-wizard tracking-wider' 
                                : 'border-blue-900/50 focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)] font-muggle text-sm'}
                         `}
                       />
                   </div>
               </div>

               {error && (
                   <div className="mt-6 text-center animate-bounce">
                       <span className="inline-block px-4 py-1 rounded bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold tracking-wider">
                           {error}
                       </span>
                   </div>
               )}
               
               <button type="submit" disabled={isLoading} className={`w-full mt-10 py-4 rounded-lg font-bold tracking-[0.2em] transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl flex items-center justify-center gap-3 relative overflow-hidden group
                  ${isWizard 
                    ? 'bg-gradient-to-r from-red-950 via-red-900 to-red-950 text-red-100 border border-red-800 hover:border-red-500' 
                    : 'bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 text-blue-100 border border-blue-800 hover:border-blue-500'} 
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
               `}>
                 <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${isWizard ? 'bg-red-500 blur-xl' : 'bg-blue-500 blur-xl'}`}></div>
                 {isLoading ? <Loader2 className="animate-spin" size={20}/> : (isWizard ? <Sparkles size={20} className="animate-pulse"/> : <Unlock size={20}/>)}
                 <span className={isWizard ? 'font-wizardTitle' : 'font-muggle'}>
                    {isLoading ? (isWizard ? 'CHANNELLING...' : 'DECRYPTING...') : (isWizard ? 'BREAK SEAL' : 'EXECUTE')}
                 </span>
               </button>
            </form>
          </div>
        ) : (
          // DASHBOARD
          <div className="flex flex-col h-full overflow-hidden bg-[#0a0a0a] text-zinc-200">
            
            {/* TABS */}
            <div className={`flex border-b shrink-0 overflow-x-auto bg-[#050505] ${isWizard ? 'border-red-900' : 'border-blue-900'}`}>
                {[
                  { id: 'creator', label: 'Item Creator', icon: PenTool, show: permissions?.canEdit },
                  { id: 'ai-lab', label: 'The Lab (AI)', icon: BrainCircuit, show: permissions?.canEdit },
                  { id: 'database', label: 'Database', icon: Database, show: true },
                  { id: 'structure', label: 'Sectors', icon: Edit3, show: permissions?.canEdit },
                  { id: 'config', label: 'Global Config', icon: Settings, show: permissions?.canEdit },
                  { id: 'users', label: 'Users & Security', icon: Users, show: true },
                  { id: 'tools', label: 'Global Tools', icon: Wrench, show: permissions?.canEdit },
                ].filter(t => t.show).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 min-w-[120px] p-4 flex items-center justify-center gap-2 transition-colors whitespace-nowrap
                           ${activeTab === tab.id 
                               ? (isWizard ? 'bg-red-900/20 text-red-100 border-b-2 border-red-500' : 'bg-blue-900/20 text-blue-100 border-b-2 border-blue-500')
                               : 'opacity-50 hover:opacity-100 hover:bg-white/5'} 
                        `}
                    >
                        <tab.icon size={16} /> <span className="font-bold">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 relative">
                
                {/* --- TAB: CREATOR (THE FORGE) --- */}
                {activeTab === 'creator' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                        {/* FORM COLUMN */}
                        <div className={`lg:col-span-7 flex flex-col p-6 rounded-xl border relative overflow-y-auto z-0 ${isWizard ? 'border-red-800/30 bg-[#0f0a0a]' : 'border-blue-800/30 bg-[#0a0a12]'}`}>
                           
                           {/* Header */}
                           <div className="font-bold mb-6 flex items-center justify-between text-xl border-b border-white/10 pb-4 text-white">
                               <div className="flex items-center gap-2">
                                   {isEditingItem ? <Edit3 size={20} className="text-yellow-500" /> : <Plus size={20} className="text-green-500" />} 
                                   {isEditingItem ? 'Editing Mode' : 'The Forge (Create Item)'}
                               </div>
                               {isEditingItem && (
                                   <button 
                                     onClick={resetForm}
                                     className="text-xs px-3 py-1.5 rounded bg-white/10 flex items-center gap-2 hover:bg-white/20 transition-colors"
                                   >
                                       <RefreshCw size={12}/> Reset to New
                                   </button>
                               )}
                           </div>
                           
                           <div className="space-y-6 pb-20">
                              <div className="grid grid-cols-2 gap-6">
                                  <div>
                                    <label className="text-xs font-bold opacity-70 block mb-1.5 text-white">TITLE</label>
                                    <input value={itemForm.title} onChange={e => setItemForm({...itemForm, title: e.target.value})} disabled={!permissions?.canEdit}
                                      className="w-full p-3 rounded bg-zinc-900 text-white border border-zinc-700 focus:border-white outline-none" placeholder="Item Headline" />
                                  </div>
                                  
                                  {/* CUSTOM SUBJECT SELECTOR */}
                                  <div className="relative">
                                    <label className="text-xs font-bold opacity-70 block mb-1.5 text-white">SUBJECT (Type New or Select)</label>
                                    <div className="flex gap-1 relative z-20">
                                        <input 
                                            value={itemForm.subject} 
                                            onChange={e => setItemForm({...itemForm, subject: e.target.value})} 
                                            disabled={!permissions?.canEdit}
                                            placeholder="Subject..."
                                            className="w-full p-3 rounded-l bg-zinc-900 text-white border border-zinc-700 focus:border-white outline-none" 
                                            onFocus={() => setShowSubjectDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowSubjectDropdown(false), 200)}
                                        />
                                        <button 
                                            type="button"
                                            className="px-3 bg-zinc-800 border border-l-0 border-zinc-700 rounded-r hover:bg-zinc-700 flex items-center justify-center transition-colors"
                                            onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                                        >
                                            {showSubjectDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                    {showSubjectDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded shadow-xl z-50 animate-[fade-in_0.1s]">
                                            {uniqueSubjects.length === 0 ? (
                                                <div className="p-3 text-xs opacity-50 italic text-center">No existing subjects. Type a new one.</div>
                                            ) : (
                                                uniqueSubjects.map(s => (
                                                    <div key={s} className="p-3 hover:bg-white/10 cursor-pointer text-sm border-b border-white/5 last:border-0 flex items-center justify-between group"
                                                        onMouseDown={(e) => { e.preventDefault(); setItemForm({...itemForm, subject: s}); setShowSubjectDropdown(false); }}>
                                                        <span>{s}</span><span className="opacity-0 group-hover:opacity-50 text-[10px] uppercase">Select</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                      <label className="text-xs font-bold opacity-70 block mb-1.5 text-white">DATE</label>
                                      <input type="date" value={itemForm.date} onChange={e => setItemForm({...itemForm, date: e.target.value})} disabled={!permissions?.canEdit}
                                        className="w-full p-3 rounded bg-zinc-900 text-white border border-zinc-700" />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold opacity-70 block mb-1.5 text-white">TARGET SECTOR</label>
                                      <select value={itemForm.sector} onChange={e => setItemForm({...itemForm, sector: e.target.value})} disabled={!permissions?.canEdit}
                                        className="w-full p-3 rounded bg-zinc-900 text-white border border-zinc-700 uppercase text-xs">
                                          {editedSectors.map(s => <option key={s.id} value={s.id}>{s.muggleName}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold opacity-70 block mb-1.5 text-white">TYPE</label>
                                      <select value={itemForm.type} onChange={e => setItemForm({...itemForm, type: e.target.value})} disabled={!permissions?.canEdit}
                                        className="w-full p-3 rounded bg-zinc-900 text-white border border-zinc-700">
                                          <option value="announcement">Announcement</option>
                                          <option value="file">File (PDF)</option>
                                          <option value="video">Video</option>
                                          <option value="task">Task</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold opacity-70 block mb-1.5 text-white">AUTHOR</label>
                                      <input value={itemForm.author} onChange={e => setItemForm({...itemForm, author: e.target.value})} disabled={!permissions?.canEdit}
                                        className="w-full p-3 rounded bg-zinc-900 text-white border border-zinc-700" />
                                  </div>
                              </div>

                              {/* Stylings */}
                              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded relative z-10">
                                  <label className="text-xs font-bold opacity-70 block mb-3 text-white flex items-center gap-2"><Palette size={14}/> STYLING & RICH TEXT</label>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-4">
                                      <div>
                                          <span className="text-[10px] text-zinc-400 block mb-1">Title Color</span>
                                          <input type="color" value={itemForm.titleColor} onChange={e => setItemForm({...itemForm, titleColor: e.target.value})} className="w-full h-8 bg-transparent border border-zinc-700 rounded cursor-pointer" />
                                      </div>
                                      <div>
                                          <span className="text-[10px] text-zinc-400 block mb-1">Body Color</span>
                                          <input type="color" value={itemForm.contentColor} onChange={e => setItemForm({...itemForm, contentColor: e.target.value})} className="w-full h-8 bg-transparent border border-zinc-700 rounded cursor-pointer" />
                                      </div>
                                      <div>
                                          <span className="text-[10px] text-zinc-400 block mb-1">Font Family</span>
                                          <select value={itemForm.fontFamily} onChange={e => setItemForm({...itemForm, fontFamily: e.target.value})} className="w-full h-8 bg-zinc-950 text-white border border-zinc-700 rounded text-xs px-1">
                                              <option value="sans">Modern Sans</option>
                                              <option value="wizard">Wizard Serif</option>
                                              <option value="muggle">Muggle Mono</option>
                                          </select>
                                      </div>
                                      <div className="flex items-center gap-2 mt-4">
                                          <input type="checkbox" checked={itemForm.isGradient} onChange={e => setItemForm({...itemForm, isGradient: e.target.checked})} className="w-4 h-4 accent-emerald-500" />
                                          <span className="text-xs text-white">Gradient Title</span>
                                      </div>
                                  </div>
                                  <div className="flex gap-2 border-t border-zinc-700 pt-3">
                                      <button onClick={() => insertTag('b')} className="p-1.5 hover:bg-white/10 rounded text-zinc-300" title="Bold"><Bold size={16}/></button>
                                      <button onClick={() => insertTag('i')} className="p-1.5 hover:bg-white/10 rounded text-zinc-300" title="Italic"><Italic size={16}/></button>
                                      <button onClick={() => insertTag('u')} className="p-1.5 hover:bg-white/10 rounded text-zinc-300" title="Underline"><Underline size={16}/></button>
                                  </div>
                              </div>

                              <div>
                                <label className="text-xs font-bold opacity-70 block mb-1.5 text-white">CONTENT (HTML Supported)</label>
                                <textarea 
                                  ref={contentRef}
                                  value={itemForm.content} 
                                  onChange={e => setItemForm({...itemForm, content: e.target.value})} 
                                  disabled={!permissions?.canEdit}
                                  className="w-full p-3 rounded bg-zinc-900 text-white border border-zinc-700 focus:border-white outline-none h-64 resize-y font-mono text-sm" 
                                />
                              </div>

                              {/* Uploads */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold opacity-70 block mb-1.5 text-white">COVER IMAGE</label>
                                    <div className="flex gap-2">
                                        <input value={itemForm.image} onChange={e => setItemForm({...itemForm, image: e.target.value})} disabled={!permissions?.canEdit}
                                            className="w-full p-3 rounded bg-zinc-900 text-white border border-zinc-700 text-xs" placeholder="https://..." />
                                        {permissions?.canEdit && (
                                            <label className={`cursor-pointer p-3 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 flex items-center justify-center ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} accept="image/*" disabled={isUploading}/>
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold opacity-70 block mb-1.5 text-white">FILE ATTACHMENT (PDF/Video)</label>
                                    <div className="flex gap-2">
                                        <input value={itemForm.fileUrl} onChange={e => setItemForm({...itemForm, fileUrl: e.target.value})} disabled={!permissions?.canEdit}
                                            className="w-full p-3 rounded bg-zinc-900 text-white border border-zinc-700 text-xs" placeholder="https://..." />
                                        {permissions?.canEdit && (
                                            <label className={`cursor-pointer p-3 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 flex items-center justify-center ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'fileUrl')} accept="application/pdf,video/*" disabled={isUploading}/>
                                            </label>
                                        )}
                                    </div>
                                </div>
                              </div>
                           </div>

                           {permissions?.canEdit && (
                             <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10 sticky bottom-0 z-20 pb-2" style={{ backgroundColor: isWizard ? '#0f0a0a' : '#0a0a12' }}>
                                 <button onClick={handleSaveItem} className={`flex-1 px-6 py-3 rounded font-bold shadow-lg text-black ${isWizard ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-fuchsia-500 hover:bg-fuchsia-400'}`}>
                                     {isEditingItem ? 'UPDATE ITEM' : 'CREATE ITEM'}
                                 </button>
                             </div>
                           )}
                        </div>

                        {/* LIVE PREVIEW COLUMN */}
                        <div className="lg:col-span-5 hidden lg:flex flex-col h-full overflow-hidden">
                            <div className="mb-4 text-xs font-bold opacity-50 uppercase tracking-widest text-center">Live Preview</div>
                            <div className="flex items-center justify-center h-full p-8 border border-white/10 rounded-xl bg-black/20 relative">
                                <div className="w-[300px] h-[450px] relative rounded-xl border flex flex-col justify-between overflow-hidden
                                    bg-black/90 border-opacity-40 shadow-2xl"
                                    style={{
                                        borderColor: isWizard ? '#10b981' : '#d946ef',
                                        boxShadow: isWizard ? '0 0 30px rgba(16,185,129,0.1)' : '0 0 30px rgba(217,70,239,0.1)'
                                    }}
                                >
                                    {itemForm.image && (
                                        <div className="absolute inset-0 z-0">
                                            <img src={itemForm.image} alt="Preview" className="w-full h-full object-cover opacity-50" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                                        </div>
                                    )}
                                    <div className="relative z-10 p-6 space-y-4 h-full flex flex-col">
                                        <div className="flex justify-between items-start">
                                            <div className="text-[10px] uppercase tracking-widest opacity-60 text-white">{itemForm.date.replace(/-/g, '.')}</div>
                                            {itemForm.isUnread && <div className="text-[10px] px-2 py-0.5 rounded border border-red-500/50 text-red-400">NEW</div>}
                                        </div>
                                        <h3 className={`text-2xl font-bold leading-tight ${itemForm.isGradient ? 'bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400' : ''}`}
                                            style={{ color: itemForm.titleColor, fontFamily: itemForm.fontFamily === 'wizard' ? '"EB Garamond", serif' : itemForm.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : undefined }}>
                                            {itemForm.title || 'Your Title Here'}
                                        </h3>
                                        <div className="text-sm opacity-80 line-clamp-5 flex-1"
                                            style={{ color: itemForm.contentColor, fontFamily: itemForm.fontFamily === 'wizard' ? '"EB Garamond", serif' : itemForm.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : undefined }}
                                            dangerouslySetInnerHTML={{__html: itemForm.content || 'Content preview...'}}
                                        ></div>
                                        <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center opacity-50">
                                            <div className="text-xs">Preview Mode</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: AI LAB --- */}
                {activeTab === 'ai-lab' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full max-w-7xl mx-auto">
                        {/* Input Column */}
                        <div className={`flex flex-col p-6 rounded-xl border relative overflow-hidden h-full ${isWizard ? 'border-emerald-800/30 bg-[#0f0a0a]' : 'border-fuchsia-800/30 bg-[#0a0a12]'}`}>
                            <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4 shrink-0">
                                <Wand2 size={24} className={isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}/>
                                <div><h4 className="font-bold text-lg text-white">The Lab: Content Alchemy</h4></div>
                            </div>
                            
                            {/* SCROLLING FIX: Added overflow-y-auto to the container holding the inputs */}
                            <div className="flex-1 space-y-6 overflow-y-auto pr-2 pb-4">
                                {/* Upload Zone with Visual Feedback */}
                                <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors relative overflow-hidden group shrink-0
                                    ${isWizard ? 'border-emerald-900/50 hover:border-emerald-500/50 hover:bg-emerald-900/10' : 'border-fuchsia-900/50 hover:border-fuchsia-500/50 hover:bg-fuchsia-900/10'}
                                `}>
                                    {selectedFile ? (
                                        <div className="flex flex-col items-center animate-[fade-in_0.3s] z-10">
                                            <FileCheck size={40} className="text-green-500 mb-2" />
                                            <p className="text-sm font-bold text-white max-w-[200px] truncate">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-500 mb-2">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                            <button 
                                                onClick={(e) => { 
                                                    e.preventDefault(); 
                                                    e.stopPropagation();
                                                    setSelectedFile(null); 
                                                    if(fileInputRef.current) fileInputRef.current.value=''; 
                                                }} 
                                                className="px-3 py-1 bg-red-900/50 hover:bg-red-900 text-red-200 text-xs rounded border border-red-800 transition-colors z-20"
                                            >
                                                Remove File
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <FileUp size={32} className={`mb-3 ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} />
                                            <p className="mb-2 text-sm text-gray-400"><span className="font-bold text-white">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-gray-500">IMG, PNG, PDF (Max 15MB)</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*,application/pdf" 
                                        onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} 
                                    />
                                </label>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold opacity-70 text-white block">EXTRA INSTRUCTIONS (Optional)</label>
                                    <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="E.g., 'Focus on the dates mentioned'..." className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/40 min-h-[100px]" />
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded bg-white/5 border border-white/10">
                                    <input type="checkbox" id="chk-summarize" checked={aiOptions.summarize} onChange={e => setAiOptions({...aiOptions, summarize: e.target.checked})} className="w-4 h-4 rounded cursor-pointer" />
                                    <label htmlFor="chk-summarize" className="text-sm font-bold text-white cursor-pointer select-none">Summarize Content</label>
                                    <span title="Check this to have the AI rewrite the content as a concise summary."><Info size={14} className="opacity-50" /></span>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-white/10 shrink-0">
                                <button onClick={handleAiParse} disabled={aiLoading} className={`w-full py-3 rounded-lg font-bold tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${isWizard ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-fuchsia-700 hover:bg-fuchsia-600 text-white'} ${aiLoading ? 'opacity-50 cursor-wait grayscale' : ''}`}>
                                    {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18}/>} 
                                    {aiLoading ? 'TRANSMUTING MATERIAL...' : 'ANALYZE & EXTRACT'}
                                </button>
                            </div>
                        </div>
                        {/* Result Column */}
                        <div className={`flex flex-col p-6 rounded-xl border relative overflow-hidden h-full ${isWizard ? 'border-emerald-800/30 bg-[#0a0505]' : 'border-fuchsia-800/30 bg-[#050510]'}`}>
                            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
                                <h4 className="font-bold text-lg text-white flex items-center gap-2"><FileCheck size={20} className={isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}/>Extraction Results</h4>
                                {aiResult && <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400 border border-green-800">Ready</span>}
                            </div>
                            {aiResult ? (
                                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] uppercase text-zinc-500 font-bold">Title</label><input value={aiResult.title} onChange={e => setAiResult({...aiResult, title: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm" /></div>
                                        <div><label className="text-[10px] uppercase text-zinc-500 font-bold">Date</label><input value={aiResult.date} onChange={e => setAiResult({...aiResult, date: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm" /></div>
                                        <div><label className="text-[10px] uppercase text-zinc-500 font-bold">Type</label><input value={aiResult.type} onChange={e => setAiResult({...aiResult, type: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm" /></div>
                                        <div><label className="text-[10px] uppercase text-zinc-500 font-bold">Subject</label><input value={aiResult.subject} onChange={e => setAiResult({...aiResult, subject: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm" /></div>
                                    </div>
                                    <div className="flex-1 flex flex-col"><label className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Content / Summary</label><textarea value={aiResult.content} onChange={e => setAiResult({...aiResult, content: e.target.value})} className="w-full flex-1 min-h-[200px] bg-zinc-900 border border-zinc-700 rounded p-3 text-white text-sm font-mono resize-none"/></div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center"><BrainCircuit size={48} className="mb-4" /><p>Results will appear here.</p></div>
                            )}
                            <div className="mt-4 pt-4 border-t border-white/10 shrink-0">
                                <button onClick={transferAiToForm} disabled={!aiResult} className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${aiResult ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>
                                    TRANSFER TO CREATOR <ArrowRight size={16} className={aiResult ? 'animate-pulse' : ''} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div className="h-full flex flex-col">
                        <div className="mb-6 flex gap-4 items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                            {/* ... same database view ... */}
                            <div className="flex gap-2 flex-1">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 text-white"/>
                                    <input type="text" placeholder="Search Database..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 text-sm rounded bg-black/50 text-white border border-white/10 outline-none focus:border-white/30" />
                                </div>
                                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 rounded bg-black/50 text-white border border-white/10 text-sm outline-none">
                                    <option value="all">All Types</option>
                                    <option value="announcement">Announcements</option>
                                    <option value="file">Files</option>
                                    <option value="video">Videos</option>
                                    <option value="task">Tasks</option>
                                </select>
                            </div>
                            <div className="text-xs opacity-50 text-white">{filteredItems.length} Records</div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {filteredItems.map(item => (
                                <div key={item.id} className="flex items-center gap-4 p-4 rounded bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-colors group">
                                    <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${isWizard ? 'bg-emerald-900/20 text-emerald-500' : 'bg-fuchsia-900/20 text-fuchsia-500'}`}>
                                        {item.type === 'video' ? <Video size={18}/> : item.type === 'file' ? <FileText size={18}/> : <ScrollText size={18}/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-bold text-white truncate">{item.title}</div>
                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-zinc-400 whitespace-nowrap ml-2">{item.sector}</span>
                                        </div>
                                        <div className="text-xs text-zinc-500 flex gap-3">
                                            <span>{item.date}</span>
                                            <span>•</span>
                                            <span className="truncate max-w-[300px]">{item.content.replace(/<[^>]*>?/gm, '').substring(0, 50)}...</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {permissions?.canEdit && <button onClick={() => startEditItem(item)} className="p-2 bg-yellow-600/20 text-yellow-500 rounded hover:bg-yellow-600 hover:text-white transition-colors" title="Edit"><Edit3 size={16}/></button>}
                                        {permissions?.canDelete && <button onClick={() => onDeleteItem && onDeleteItem(item.id)} className="p-2 bg-red-600/20 text-red-500 rounded hover:bg-red-600 hover:text-white transition-colors" title="Delete"><Trash2 size={16}/></button>}
                                    </div>
                                </div>
                            ))}
                            {filteredItems.length === 0 && <div className="text-center opacity-30 py-10">No records found matching criteria.</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'structure' && (
                    <div className="h-full flex flex-col overflow-y-auto max-w-5xl mx-auto p-2">
                        <div className="mb-6 flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Sector Architecture</h3>
                                <p className="text-xs opacity-50 text-zinc-300">Customize navigation items and terminology.</p>
                            </div>
                            <button onClick={handleSaveSectors} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center gap-2"><Save size={16}/> Save Changes</button>
                        </div>
                        <div className="grid grid-cols-1 gap-6 pb-20">
                            {editedSectors.map((sector, idx) => (
                                <div key={sector.id} className="p-6 rounded-xl border bg-black/40 border-white/10 flex flex-col gap-4">
                                    <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
                                        <div className="font-mono text-xs opacity-50 text-white">ID: {sector.id}</div>
                                        <div className="text-xs px-2 py-1 rounded bg-white/10 text-white">{idx + 1}</div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4 border-r border-white/5 pr-4">
                                            <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={12}/> Wizard Mode</h4>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 block mb-1">Name</label>
                                                <input value={sector.wizardName} onChange={(e) => handleUpdateSector(idx, 'wizardName', e.target.value)} className="w-full bg-black/50 border border-emerald-900/50 rounded p-2 text-emerald-100 text-sm font-wizard"/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 block mb-1">Icon Name (Lucide)</label>
                                                <input value={sector.wizardIcon} onChange={(e) => handleUpdateSector(idx, 'wizardIcon', e.target.value)} className="w-full bg-black/50 border border-emerald-900/50 rounded p-2 text-emerald-100 text-sm font-mono"/>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-fuchsia-400 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Terminal size={12}/> Muggle Mode</h4>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 block mb-1">Name</label>
                                                <input value={sector.muggleName} onChange={(e) => handleUpdateSector(idx, 'muggleName', e.target.value)} className="w-full bg-black/50 border border-fuchsia-900/50 rounded p-2 text-fuchsia-100 text-sm font-muggle"/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 block mb-1">Icon Name (Lucide)</label>
                                                <input value={sector.muggleIcon} onChange={(e) => handleUpdateSector(idx, 'muggleIcon', e.target.value)} className="w-full bg-black/50 border border-fuchsia-900/50 rounded p-2 text-fuchsia-100 text-sm font-mono"/>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <label className="text-[10px] text-zinc-500 block mb-1">Description</label>
                                        <input value={sector.description} onChange={(e) => handleUpdateSector(idx, 'description', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="h-full overflow-y-auto p-4 max-w-3xl mx-auto space-y-8 pb-20">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-white">Global Configuration</h3>
                            <button onClick={handleSaveConfig} className="px-6 py-2 bg-white text-black font-bold rounded shadow hover:bg-gray-200">Save Config</button>
                        </div>

                        <div className="p-6 border border-white/10 rounded-lg bg-black/40">
                            <h3 className="font-bold text-emerald-400 mb-6 flex items-center gap-2"><Sparkles size={18}/> Wizard Theme Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-xs opacity-50 block mb-1 text-white">Site Title</label><input value={editedConfig.wizardTitle} onChange={e => setEditedConfig({...editedConfig, wizardTitle: e.target.value})} className="w-full bg-zinc-900 border border-emerald-900 rounded p-2 text-white"/></div>
                                <div><label className="text-xs opacity-50 block mb-1 text-white">Logo Text (Short)</label><input value={editedConfig.wizardLogoText} onChange={e => setEditedConfig({...editedConfig, wizardLogoText: e.target.value})} className="w-full bg-zinc-900 border border-emerald-900 rounded p-2 text-white"/></div>
                                <div className="md:col-span-2"><label className="text-xs opacity-50 block mb-1 text-white">Gate Welcome Text</label><input value={editedConfig.wizardGateText} onChange={e => setEditedConfig({...editedConfig, wizardGateText: e.target.value})} className="w-full bg-zinc-900 border border-emerald-900 rounded p-2 text-white"/></div>
                                <div className="md:col-span-2"><label className="text-xs opacity-50 block mb-1 text-white">Background Image URL</label><input value={editedConfig.wizardImage} onChange={e => setEditedConfig({...editedConfig, wizardImage: e.target.value})} className="w-full bg-zinc-900 border border-emerald-900 rounded p-2 text-white text-xs font-mono"/></div>
                                <div className="md:col-span-2"><label className="text-xs opacity-50 block mb-1 text-white">Logo Image URL (Optional)</label><input value={editedConfig.wizardLogoUrl || ''} onChange={e => setEditedConfig({...editedConfig, wizardLogoUrl: e.target.value})} className="w-full bg-zinc-900 border border-emerald-900 rounded p-2 text-white text-xs font-mono"/></div>
                                <div className="md:col-span-2"><label className="text-xs opacity-50 block mb-1 text-white">Alarm Sound URL</label><input value={editedConfig.wizardAlarmUrl} onChange={e => setEditedConfig({...editedConfig, wizardAlarmUrl: e.target.value})} className="w-full bg-zinc-900 border border-emerald-900 rounded p-2 text-white text-xs font-mono"/></div>
                            </div>
                        </div>

                        <div className="p-6 border border-white/10 rounded-lg bg-black/40">
                            <h3 className="font-bold text-fuchsia-400 mb-6 flex items-center gap-2"><Terminal size={18}/> Muggle Theme Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-xs opacity-50 block mb-1 text-white">Site Title</label><input value={editedConfig.muggleTitle} onChange={e => setEditedConfig({...editedConfig, muggleTitle: e.target.value})} className="w-full bg-zinc-900 border border-fuchsia-900 rounded p-2 text-white"/></div>
                                <div><label className="text-xs opacity-50 block mb-1 text-white">Logo Text (Short)</label><input value={editedConfig.muggleLogoText} onChange={e => setEditedConfig({...editedConfig, muggleLogoText: e.target.value})} className="w-full bg-zinc-900 border border-fuchsia-900 rounded p-2 text-white"/></div>
                                <div className="md:col-span-2"><label className="text-xs opacity-50 block mb-1 text-white">Gate Welcome Text</label><input value={editedConfig.muggleGateText} onChange={e => setEditedConfig({...editedConfig, muggleGateText: e.target.value})} className="w-full bg-zinc-900 border border-fuchsia-900 rounded p-2 text-white"/></div>
                                <div className="md:col-span-2"><label className="text-xs opacity-50 block mb-1 text-white">Background Image URL</label><input value={editedConfig.muggleImage} onChange={e => setEditedConfig({...editedConfig, muggleImage: e.target.value})} className="w-full bg-zinc-900 border border-fuchsia-900 rounded p-2 text-white text-xs font-mono"/></div>
                                <div className="md:col-span-2"><label className="text-xs opacity-50 block mb-1 text-white">Logo Image URL (Optional)</label><input value={editedConfig.muggleLogoUrl || ''} onChange={e => setEditedConfig({...editedConfig, muggleLogoUrl: e.target.value})} className="w-full bg-zinc-900 border border-fuchsia-900 rounded p-2 text-white text-xs font-mono"/></div>
                                <div className="md:col-span-2"><label className="text-xs opacity-50 block mb-1 text-white">Alarm Sound URL</label><input value={editedConfig.muggleAlarmUrl} onChange={e => setEditedConfig({...editedConfig, muggleAlarmUrl: e.target.value})} className="w-full bg-zinc-900 border border-fuchsia-900 rounded p-2 text-white text-xs font-mono"/></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="h-full flex flex-col max-w-4xl mx-auto">
                        <div className="flex gap-6 mb-8">
                            <div className="flex-1 p-6 border border-white/10 rounded-lg bg-white/5">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Shield size={18}/> Create Admin</h3>
                                <div className="space-y-3">
                                    <input value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="Username" className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"/>
                                    <input type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} placeholder="Password" className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"/>
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        <label className="text-xs text-white flex items-center gap-1"><input type="checkbox" checked={newPermissions.canEdit} onChange={e => setNewPermissions({...newPermissions, canEdit: e.target.checked})}/> Edit</label>
                                        <label className="text-xs text-white flex items-center gap-1"><input type="checkbox" checked={newPermissions.canDelete} onChange={e => setNewPermissions({...newPermissions, canDelete: e.target.checked})}/> Delete</label>
                                        <label className="text-xs text-white flex items-center gap-1"><input type="checkbox" checked={newPermissions.canManageUsers} onChange={e => setNewPermissions({...newPermissions, canManageUsers: e.target.checked})}/> Users</label>
                                        <label className="text-xs text-white flex items-center gap-1"><input type="checkbox" checked={newPermissions.canViewLogs} onChange={e => setNewPermissions({...newPermissions, canViewLogs: e.target.checked})}/> Logs</label>
                                    </div>
                                    <button onClick={handleCreateUser} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm font-bold mt-2">Create User</button>
                                </div>
                            </div>
                            <div className="flex-1 p-6 border border-white/10 rounded-lg bg-white/5">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><KeyRound size={18}/> Change My Password</h3>
                                <div className="space-y-3">
                                    <input type="password" value={currPass} onChange={e => setCurrPass(e.target.value)} placeholder="Current Password" className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"/>
                                    <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New Password" className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"/>
                                    {passMsg && <div className="text-xs text-emerald-400">{passMsg}</div>}
                                    <button onClick={handleChangePassword} className="w-full py-2 bg-fuchsia-600 hover:bg-fuchsia-500 rounded text-white text-sm font-bold mt-2">Update Password</button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto border border-white/10 rounded-lg">
                            <table className="w-full text-left text-sm text-white">
                                <thead className="bg-white/10 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="p-3">Username</th>
                                        <th className="p-3">Permissions</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.username} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-3 font-mono">{u.username}</td>
                                            <td className="p-3 opacity-70 text-xs">
                                                {Object.entries(u.permissions || {}).filter(([k,v]) => v && k!=='isGod').map(([k]) => k.replace('can','')).join(', ')}
                                                {u.permissions?.isGod && <span className="text-yellow-500 ml-1">GOD</span>}
                                            </td>
                                            <td className="p-3 text-right">
                                                {!u.permissions?.isGod && (
                                                    <button onClick={() => handleDeleteUser(u.username)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'tools' && (
                    <div className="h-full flex flex-col max-w-2xl mx-auto">
                        <div className="mb-6 p-4 border border-white/10 rounded-lg bg-white/5">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Replace size={18}/> Global Find & Replace</h3>
                            <div className="flex gap-2 mb-2">
                                <input value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find text..." className="flex-1 bg-black/50 border border-white/10 rounded p-2 text-white"/>
                                <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace with..." className="flex-1 bg-black/50 border border-white/10 rounded p-2 text-white"/>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={scanForMatches} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-bold">Scan Database</button>
                                <button onClick={executeReplaceAll} disabled={!hasScanned || foundMatches.length === 0} className={`flex-1 py-2 rounded text-white text-sm font-bold ${!hasScanned || foundMatches.length === 0 ? 'bg-zinc-700 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'}`}>Replace All</button>
                            </div>
                        </div>
                        {hasScanned && (
                            <div className="flex-1 overflow-y-auto border border-white/10 rounded-lg">
                                <div className="p-2 bg-white/10 text-xs font-bold text-white uppercase flex justify-between">
                                    <span>Found {foundMatches.length} Matches</span>
                                    <button onClick={() => {setFoundMatches([]); setHasScanned(false);}} className="text-white hover:text-red-400">Clear</button>
                                </div>
                                {foundMatches.map((m, i) => (
                                    <div key={i} className="p-3 border-b border-white/5 flex justify-between items-center hover:bg-white/5 text-white">
                                        <div className="overflow-hidden">
                                            <div className="text-sm font-bold truncate">{m.title}</div>
                                            <div className="text-[10px] opacity-50 uppercase">{m.context}</div>
                                        </div>
                                        <button onClick={() => executeReplace(m.itemId, m.context)} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded">Replace</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className={`p-4 border-t flex justify-between items-center shrink-0 bg-[#050505] ${isWizard ? 'border-red-900/30' : 'border-blue-900/30'}`}>
               <div className="flex items-center gap-4">
                  <button onClick={onLogout} className="text-xs opacity-50 hover:opacity-100 hover:underline text-white flex items-center gap-2">
                     <Lock size={12}/> Secure Logout
                  </button>
               </div>
               <button onClick={onClearData} className="text-xs text-red-500 border border-red-900 px-4 py-2 rounded hover:bg-red-900/20 font-bold transition-colors">
                  FACTORY RESET SYSTEM
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
