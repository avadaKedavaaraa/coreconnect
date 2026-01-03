
import React, { useState, useEffect, useRef } from 'react';
import { Lineage, Sector, CarouselItem, AdminPermissions, GlobalConfig, LectureRule, VisitorLog, AdminUser, AuditLog } from '../types';
import { API_URL } from '../App';
import { 
  X, Unlock, Lock, Loader2, Database, PenTool, CalendarDays, HardDrive, 
  BrainCircuit, ScanFace, Users, Activity, Settings, LayoutTemplate, Search, 
  Filter, Replace, Edit3, Trash2, Plus, Upload, ImageIcon, Save, Shield, 
  ShieldAlert, FileUp, AlertTriangle, RefreshCw
} from 'lucide-react';
import DOMPurify from 'dompurify';

interface AdminPanelProps {
  lineage: Lineage | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  csrfToken: string;
  onLogin: (token: string, permissions: AdminPermissions) => void;
  onLogout: () => void;
  currentUser: string;
  permissions: AdminPermissions | null;
  initialTab?: 'database' | 'creator' | 'scheduler' | 'config' | 'users' | 'visitors' | 'backup' | 'ai-lab' | 'structure';
  
  allItems: CarouselItem[];
  sectors: Sector[];
  globalConfig: GlobalConfig;
  initialEditingItem: CarouselItem | null;
  defaultSector: string;

  onAddItem: (item: CarouselItem) => void;
  onUpdateItem: (item: CarouselItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateSectors: (sectors: Sector[]) => Promise<void>;
  onUpdateConfig: (config: GlobalConfig) => Promise<void>;
  onClearData: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  lineage, isOpen, onClose, isAdmin, csrfToken, onLogin, onLogout, currentUser, permissions, initialTab = 'database',
  onAddItem, onUpdateItem, onDeleteItem, onUpdateSectors, onUpdateConfig, allItems = [], sectors = [], globalConfig, onClearData, initialEditingItem, defaultSector
}) => {
  const isWizard = lineage === Lineage.WIZARD;
  const [activeTab, setActiveTab] = useState<'creator' | 'ai-lab' | 'database' | 'visitors' | 'structure' | 'users' | 'logs' | 'config' | 'backup' | 'scheduler'>(initialTab || 'database');
  
  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Database Tab State
  const [itemSearch, setItemSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [foundMatches, setFoundMatches] = useState<{id: string, title: string, context: string}[]>([]);

  // Creator Tab State
  const [itemForm, setItemForm] = useState<CarouselItem>({
      id: '', title: '', content: '', date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      type: 'announcement', sector: defaultSector, subject: 'General', isUnread: true, likes: 0,
      style: { titleColor: '#ffffff', contentColor: '#e4e4e7', fontFamily: 'sans', isGradient: false }
  });
  const [isEditingItem, setIsEditingItem] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  
  // Scheduler Tab State
  const [schedules, setSchedules] = useState<LectureRule[]>(globalConfig.schedules || []);
  const [newRule, setNewRule] = useState<LectureRule>({
      id: '', subject: '', dayOfWeek: 'Monday', startTime: '10:00', link: '', recurrence: 'weekly', isActive: true
  });

  // Config Tab State
  const [editedConfig, setEditedConfig] = useState<GlobalConfig>(globalConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Structure Tab State
  const [editedSectors, setEditedSectors] = useState<Sector[]>(sectors);

  // Users Tab State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newUser, setNewUser] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newPermissions, setNewPermissions] = useState<AdminPermissions>({ canEdit: false, canDelete: false, canManageUsers: false, canViewLogs: false, isGod: false });

  // Logs/Visitors Tab State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);

  // AI Lab State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup Tab State
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState('');
  const [importProgress, setImportProgress] = useState(0);

  // --- EFFECTS ---
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
      if (initialEditingItem) {
          setItemForm(initialEditingItem);
          setIsEditingItem(true);
          setActiveTab('creator');
      } else {
          resetItemForm();
      }
  }, [initialEditingItem, isOpen]);

  useEffect(() => {
      setEditedConfig(globalConfig);
      setSchedules(globalConfig.schedules || []);
      setEditedSectors(sectors);
  }, [globalConfig, sectors, isOpen]);

  useEffect(() => {
      if(activeTab === 'users' && isAdmin) fetchUsers();
      if(activeTab === 'visitors' && isAdmin) fetchVisitors();
      if(activeTab === 'logs' && isAdmin) fetchAuditLogs();
  }, [activeTab, isAdmin]);

  const resetItemForm = () => {
      setItemForm({
          id: crypto.randomUUID(), title: '', content: '', date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
          type: 'announcement', sector: defaultSector, subject: 'General', isUnread: true, likes: 0,
          style: { titleColor: '#ffffff', contentColor: '#e4e4e7', fontFamily: 'sans', isGradient: false }
      });
      setIsEditingItem(false);
  };

  // --- API HANDLERS ---
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
      
      const text = await res.text();
      let data;
      try {
          data = JSON.parse(text);
      } catch (e) {
          // If HTML returned (502 or 500)
          throw new Error(`Server Error (${res.status}). Connection failed.`);
      }

      if (!res.ok) throw new Error(data.error || 'Authentication Failed');
      
      onLogin(data.csrfToken, data.permissions);
      setLoginPass(''); setLoginUser('');
    } catch (err: any) { 
        console.error(err);
        setError(err.message || 'Login Failed'); 
    } finally { setIsLoading(false); }
  };

  const fetchUsers = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/users`, { headers: { 'x-csrf-token': csrfToken } });
          const data = await res.json();
          if(res.ok) setUsers(data);
      } catch(e) {}
  };

  const handleCreateUser = async () => {
      if(!newUser || !newUserPass) return;
      try {
          const res = await fetch(`${API_URL}/api/admin/users/add`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
              body: JSON.stringify({ username: newUser, password: newUserPass, permissions: newPermissions })
          });
          if(res.ok) { fetchUsers(); setNewUser(''); setNewUserPass(''); alert('User created'); }
          else { const d = await res.json(); alert(d.error); }
      } catch(e) {}
  };

  const handleDeleteUser = async (username: string) => {
      if(!confirm(`Delete user ${username}?`)) return;
      try {
          const res = await fetch(`${API_URL}/api/admin/users/delete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
              body: JSON.stringify({ targetUser: username })
          });
          if(res.ok) fetchUsers();
          else { const d = await res.json(); alert(d.error); }
      } catch(e) {}
  };

  const fetchVisitors = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/visitors`, { headers: { 'x-csrf-token': csrfToken } });
          const data = await res.json();
          if(res.ok) setVisitors(data);
      } catch(e) {}
  };

  const fetchAuditLogs = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/logs`, { headers: { 'x-csrf-token': csrfToken } });
          const data = await res.json();
          if(res.ok) setAuditLogs(data);
      } catch(e) {}
  };

  // --- CREATOR LOGIC ---
  const handleSaveItem = () => {
      if (!itemForm.title) {
          // Auto extract from content if possible
          const parser = new DOMParser();
          const doc = parser.parseFromString(itemForm.content, 'text/html');
          const extractedTitle = doc.body.textContent?.substring(0, 50) || 'Untitled';
          itemForm.title = extractedTitle;
      }
      
      if (isEditingItem) {
          onUpdateItem(itemForm);
      } else {
          onAddItem({...itemForm, id: crypto.randomUUID()});
      }
      resetItemForm();
      setActiveTab('database');
  };

  const insertTag = (tag: string) => {
      if (!contentRef.current) return;
      const start = contentRef.current.selectionStart;
      const end = contentRef.current.selectionEnd;
      const text = itemForm.content;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const insert = `<${tag}>${text.substring(start, end)}</${tag}>`;
      setItemForm({ ...itemForm, content: before + insert + after });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'fileUrl' | 'wizardLogoUrl' | 'muggleLogoUrl' | 'wizardImage' | 'muggleImage') => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
          const res = await fetch(`${API_URL}/api/admin/upload`, {
              method: 'POST',
              headers: { 'x-csrf-token': csrfToken },
              body: formData
          });
          const data = await res.json();
          if (res.ok) {
              if (field === 'wizardLogoUrl' || field === 'muggleLogoUrl' || field === 'wizardImage' || field === 'muggleImage') {
                  setEditedConfig(prev => ({ ...prev, [field]: data.url }));
              } else {
                  setItemForm(prev => ({ ...prev, [field]: data.url }));
              }
          } else {
              alert('Upload failed: ' + data.error);
          }
      } catch (e) {
          alert('Upload failed');
      }
  };

  // --- DATABASE LOGIC ---
  const filteredItems = allItems.filter(item => {
      const matchSearch = item.title.toLowerCase().includes(itemSearch.toLowerCase()) || 
                          item.content.toLowerCase().includes(itemSearch.toLowerCase());
      const matchType = typeFilter === 'all' || item.type === typeFilter;
      return matchSearch && matchType;
  });

  const scanForMatches = () => {
      if(!findText) return;
      const matches = allItems.filter(i => i.content.includes(findText) || i.title.includes(findText))
          .map(i => ({ id: i.id, title: i.title, context: 'Content/Title' }));
      setFoundMatches(matches);
  };

  const executeReplaceAll = () => {
      if (!findText) return;
      if (!confirm(`Replace "${findText}" with "${replaceText}" in ${foundMatches.length} items?`)) return;
      
      foundMatches.forEach(match => {
          const item = allItems.find(i => i.id === match.id);
          if (item) {
              const updated = {
                  ...item,
                  title: item.title.replace(new RegExp(findText, 'g'), replaceText),
                  content: item.content.replace(new RegExp(findText, 'g'), replaceText)
              };
              onUpdateItem(updated);
          }
      });
      setFoundMatches([]);
      setFindText('');
  };
  
  const startEditItem = (item: CarouselItem) => {
      setItemForm(item);
      setIsEditingItem(true);
      setActiveTab('creator');
  };

  // --- SCHEDULER LOGIC ---
  const handleAddRule = () => {
      if(!newRule.subject) return;
      const rule: LectureRule = { ...newRule, id: crypto.randomUUID() };
      const updated = [...schedules, rule];
      setSchedules(updated);
      setEditedConfig({ ...editedConfig, schedules: updated });
      // We don't save immediately, user must click 'Save Config' or we can auto-save schedule separately
      // For UX consistency, let's update global config state so when they click save config it saves.
  };

  const handleDeleteRule = (id: string) => {
      const updated = schedules.filter(s => s.id !== id);
      setSchedules(updated);
      setEditedConfig({ ...editedConfig, schedules: updated });
  };

  // --- AI LAB LOGIC ---
  const handleAiParse = async () => {
      setAiLoading(true);
      setAiResult(null);
      try {
          const formData = new FormData();
          formData.append('prompt', aiPrompt);
          if (selectedFile) formData.append('file', selectedFile);

          const res = await fetch(`${API_URL}/api/ai/parse`, {
              method: 'POST',
              headers: { 'x-csrf-token': csrfToken },
              body: formData
          });
          const data = await res.json();
          if (res.ok) setAiResult(data);
          else alert(data.error);
      } catch (e) { alert('AI Error'); }
      finally { setAiLoading(false); }
  };

  const transferAiToForm = () => {
      if (!aiResult) return;
      setItemForm(prev => ({
          ...prev,
          title: aiResult.title || prev.title,
          content: aiResult.content || prev.content,
          date: aiResult.date ? aiResult.date.replace(/-/g, '.') : prev.date,
          type: aiResult.type || prev.type,
          subject: aiResult.subject || prev.subject
      }));
      setActiveTab('creator');
  };

  // --- CONFIG LOGIC ---
  const handleSaveConfig = async () => {
      setIsSavingConfig(true);
      try {
          await onUpdateConfig(editedConfig);
      } finally {
          setIsSavingConfig(false);
      }
  };

  // --- STRUCTURE LOGIC ---
  const handleUpdateSector = (idx: number, field: keyof Sector, value: string) => {
      const updated = [...editedSectors];
      updated[idx] = { ...updated[idx], [field]: value };
      setEditedSectors(updated);
  };

  const handleSaveSectors = async () => {
      await onUpdateSectors(editedSectors);
  };

  // --- EXPORT/IMPORT ---
  const handleExportData = async () => {
      setIsLoading(true);
      try {
          const res = await fetch(`${API_URL}/api/admin/export`, { headers: { 'x-csrf-token': csrfToken } });
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `core_connect_backup_${new Date().toISOString()}.json`;
          a.click();
      } catch (e) { alert("Export failed"); }
      finally { setIsLoading(false); }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsLoading(true);
      setImportStatus('Reading file...');
      setImportProgress(10);
      
      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const json = JSON.parse(evt.target?.result as string);
              setImportStatus('Uploading to server...');
              setImportProgress(50);
              
              const res = await fetch(`${API_URL}/api/admin/import`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                  body: JSON.stringify(json)
              });
              
              if (res.ok) {
                  setImportStatus('Complete! Reloading...');
                  setImportProgress(100);
                  setTimeout(() => window.location.reload(), 1000);
              } else {
                  const d = await res.json();
                  alert(d.error);
                  setImportStatus('Failed');
              }
          } catch (e) {
              alert("Invalid Backup File");
              setImportStatus('Error');
          } finally {
              setIsLoading(false);
          }
      };
      reader.readAsText(file);
  };

  // --- RENDER HELPERS ---
  const uniqueSubjects = Array.from(new Set(allItems.map(i => i.subject || 'General'))).sort();
  const previewTitleStyle = itemForm.style?.isGradient ? {
        backgroundImage: `linear-gradient(to right, ${itemForm.style.titleColor}, ${itemForm.style.titleColorEnd || itemForm.style.titleColor})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        color: 'transparent'
    } : {
        color: itemForm.style?.titleColor
    };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-2 sm:p-4 animate-[fade-in_0.2s_ease-out]">
      <div className={`w-full max-w-7xl rounded-xl border shadow-2xl overflow-hidden flex flex-col relative h-[100dvh] sm:h-full sm:max-h-[95vh] text-zinc-200 transition-colors duration-500
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
            </div>
            </div>
        )}

        {!isAdmin ? (
          <div className="flex-1 flex items-center justify-center p-6 w-full relative overflow-hidden h-full">
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                <div className={`w-[600px] h-[600px] border-[2px] rounded-full absolute animate-spin-slow ${isWizard ? 'border-red-600/20' : 'border-blue-600/20'}`}></div>
                <div className={`w-[500px] h-[500px] border-[4px] border-dashed rounded-full absolute animate-reverse-spin ${isWizard ? 'border-red-500/30' : 'border-blue-500/30'}`}></div>
                <div className={`w-[400px] h-[400px] border-[1px] rounded-full absolute animate-pulse ${isWizard ? 'border-red-400/40' : 'border-blue-400/40'}`}></div>
             </div>

             <div className="z-10 w-full max-w-sm relative group">
                <div className={`absolute -inset-1 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 ${isWizard ? 'bg-red-600' : 'bg-blue-600'}`}></div>
                <form onSubmit={handleLogin} className={`relative p-8 rounded-2xl border backdrop-blur-xl shadow-2xl flex flex-col gap-6
                    ${isWizard ? 'bg-black/90 border-red-900/50' : 'bg-black/90 border-blue-900/50'}
                `}>
                    <div className="text-center">
                        <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center border-2 ${isWizard ? 'border-red-500 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'border-blue-500 text-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.5)]'}`}>
                            <Lock size={32} />
                        </div>
                        <h2 className={`text-2xl font-bold tracking-widest ${isWizard ? 'text-red-100 font-wizardTitle' : 'text-blue-100 font-muggle'}`}>RESTRICTED</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <input 
                                type="text" value={loginUser} onChange={(e) => setLoginUser(e.target.value)}
                                placeholder="IDENTIFIER"
                                className={`w-full bg-black/50 border rounded-lg p-4 text-center outline-none focus:scale-105 transition-transform tracking-widest
                                    ${isWizard ? 'border-red-900 focus:border-red-500 text-red-100' : 'border-blue-900 focus:border-blue-500 text-blue-100'}
                                `}
                            />
                        </div>
                        <div className="relative">
                            <input 
                                type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)}
                                placeholder="Passkey"
                                className={`w-full bg-black/50 border rounded-lg p-4 text-center outline-none focus:scale-105 transition-transform tracking-widest
                                    ${isWizard ? 'border-red-900 focus:border-red-500 text-red-100' : 'border-blue-900 focus:border-blue-500 text-blue-100'}
                                `}
                            />
                        </div>
                        {error && (
                            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-xs text-center font-bold animate-pulse">
                                {error}
                            </div>
                        )}
                        <button 
                            type="submit" disabled={isLoading}
                            className={`w-full py-4 rounded-lg font-bold tracking-[0.2em] transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2
                                ${isWizard ? 'bg-gradient-to-r from-red-900 to-red-800 text-white' : 'bg-gradient-to-r from-blue-900 to-blue-800 text-white'}
                            `}
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'INITIALIZE'}
                        </button>
                    </div>
                </form>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
            {/* Sidebar */}
            <nav className={`sm:w-64 shrink-0 overflow-y-auto border-b sm:border-b-0 sm:border-r flex sm:flex-col ${isWizard ? 'bg-red-950/10 border-red-900/30' : 'bg-blue-950/10 border-blue-900/30'}`}>
                <div className="p-2 sm:p-4 flex sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible">
                    {[
                        { id: 'database', icon: Database, label: 'Database' },
                        { id: 'creator', icon: PenTool, label: 'Creator' },
                        { id: 'scheduler', icon: CalendarDays, label: 'Scheduler' },
                        { id: 'backup', icon: HardDrive, label: 'System Backup' },
                        { id: 'ai-lab', icon: BrainCircuit, label: 'AI Magic' },
                        { id: 'visitors', icon: ScanFace, label: 'Visitors' },
                        { id: 'users', icon: Users, label: 'Admins' },
                        { id: 'logs', icon: Activity, label: 'Audit Logs' },
                        { id: 'config', icon: Settings, label: 'Config' },
                        { id: 'structure', icon: LayoutTemplate, label: 'Sectors' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`p-3 rounded-lg flex items-center gap-3 transition-all whitespace-nowrap ${activeTab === tab.id ? (isWizard ? 'bg-red-900/30 text-red-100' : 'bg-blue-900/30 text-blue-100') : 'opacity-50 hover:opacity-100 hover:bg-white/5'}`}>
                            <tab.icon size={18} /> <span className="font-bold text-sm">{tab.label}</span>
                        </button>
                    ))}
                    <button onClick={onLogout} className="mt-auto p-3 rounded-lg flex items-center gap-3 text-red-400 opacity-50 hover:opacity-100 hover:bg-red-900/20">
                        <Lock size={18} /> <span className="font-bold text-sm">Logout</span>
                    </button>
                </div>
            </nav>

            <main className="flex-1 overflow-y-auto p-4 sm:p-8 relative custom-scrollbar">
                
                {/* DATABASE TAB */}
                {activeTab === 'database' && (
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 text-white/50" size={18} />
                                <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search DB..." className="w-full pl-10 p-3 bg-white/5 border border-white/10 rounded outline-none" />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Filter size={14}/></div>
                                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-full pl-9 pr-4 bg-white/5 border border-white/10 rounded appearance-none outline-none cursor-pointer">
                                    <option value="all" className="bg-black">All Types</option>
                                    <option value="announcement" className="bg-black">Announcements</option>
                                    <option value="file" className="bg-black">Files</option>
                                    <option value="video" className="bg-black">Videos</option>
                                    <option value="task" className="bg-black">Tasks</option>
                                    <option value="mixed" className="bg-black">Mixed</option>
                                    <option value="link" className="bg-black">Links</option>
                                    <option value="code" className="bg-black">Code</option>
                                </select>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Replace size={14}/></div>
                                <input value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find..." className="h-full pl-9 p-3 bg-white/5 border border-white/10 rounded outline-none w-32 focus:w-48 transition-all" />
                                {findText && <button onClick={scanForMatches} className="absolute right-2 top-2 p-1 bg-white/10 rounded hover:bg-white/20"><Search size={14}/></button>}
                            </div>
                        </div>

                        {foundMatches.length > 0 && (
                            <div className="p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-yellow-200 font-bold">Found {foundMatches.length} occurrences of "{findText}"</span>
                                    <div className="flex gap-2">
                                        <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace with..." className="p-1 px-2 bg-black/50 border border-yellow-500/30 rounded text-sm text-white" />
                                        <button onClick={executeReplaceAll} className="px-3 py-1 bg-yellow-600 rounded text-black font-bold text-xs hover:bg-yellow-500">REPLACE ALL</button>
                                        <button onClick={() => setFoundMatches([])} className="p-1 hover:bg-white/10 rounded"><X size={14}/></button>
                                    </div>
                                </div>
                                <div className="max-h-32 overflow-y-auto text-xs text-white/60">
                                    {foundMatches.slice(0, 10).map((m, i) => <div key={i}>Match in: {m.title} ({m.context})</div>)}
                                    {foundMatches.length > 10 && <div>...and {foundMatches.length - 10} more</div>}
                                </div>
                            </div>
                        )}

                        <div className="grid gap-4">
                            {filteredItems.map(item => {
                                const listTitleStyle = item.style?.isGradient ? {
                                    backgroundImage: `linear-gradient(to right, ${item.style.titleColor}, ${item.style.titleColorEnd || item.style.titleColor})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    color: 'transparent'
                                } : {
                                    color: item.style?.titleColor
                                };

                                return (
                                <div key={item.id} className="p-4 rounded bg-white/5 border border-white/10 flex justify-between items-center group hover:bg-white/10 transition-colors">
                                    <div>
                                        <div className="font-bold" style={listTitleStyle}>{item.title}</div>
                                        <div className="text-xs opacity-50 flex gap-2">
                                            <span>{item.date}</span> • <span>{item.type}</span> • <span>{item.sector}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditItem(item)} className="p-2 bg-blue-600 rounded hover:bg-blue-500"><Edit3 size={16}/></button>
                                        <button onClick={() => { if(confirm('Delete?')) onDeleteItem(item.id) }} className="p-2 bg-red-600 rounded hover:bg-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            )})}
                            {filteredItems.length === 0 && <div className="text-center opacity-50 py-10">No items found</div>}
                        </div>
                    </div>
                )}
                
                {/* ... other tabs content ... */}
                {/* Due to length limits, retaining the full component logic provided previously but ensuring types match. */}
                {/* The structure logic is identical to before but ensures error handling in login is displayed. */}
                
                {activeTab === 'creator' && (
                    <div className="flex flex-col xl:flex-row gap-8">
                        {/* Editor Column */}
                        <div className="flex-1 space-y-6 max-w-2xl">
                            {/* ... same editor inputs ... */}
                            <div className="grid grid-cols-2 gap-4">
                                <input value={itemForm.title} onChange={e => setItemForm({...itemForm, title: e.target.value})} placeholder="Title (Leave empty to auto-extract from HTML)" className="col-span-2 p-3 bg-white/5 border border-white/10 rounded text-white outline-none" />
                                <select value={itemForm.type} onChange={e => setItemForm({...itemForm, type: e.target.value as any})} className="p-3 bg-white/5 border border-white/10 rounded text-white outline-none">
                                    <option value="announcement" className="bg-black">Announcement</option>
                                    <option value="file" className="bg-black">File</option>
                                    <option value="video" className="bg-black">Video</option>
                                    <option value="task" className="bg-black">Task / Tutorial</option>
                                    <option value="mixed" className="bg-black">Mixed Content</option>
                                    <option value="link" className="bg-black">External Link</option>
                                    <option value="code" className="bg-black">Code Snippet</option>
                                </select>
                                <select value={itemForm.sector} onChange={e => setItemForm({...itemForm, sector: e.target.value})} className="p-3 bg-white/5 border border-white/10 rounded text-white outline-none">
                                    {sectors.map(s => <option key={s.id} value={s.id} className="bg-black">{isWizard ? s.wizardName : s.muggleName}</option>)}
                                </select>
                                <input type="date" value={itemForm.date} onChange={e => setItemForm({...itemForm, date: e.target.value})} className="p-3 bg-white/5 border border-white/10 rounded text-white outline-none" />
                                <div className="relative"><input list="subjects-list" value={itemForm.subject} onChange={e => setItemForm({...itemForm, subject: e.target.value})} placeholder="Subject" className="w-full p-3 bg-white/5 border border-white/10 rounded text-white outline-none" /><datalist id="subjects-list">{uniqueSubjects.map(s => <option key={s} value={s} />)}</datalist></div>
                            </div>
                            
                            <div className="p-4 rounded border border-white/10 bg-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {['b','i','u','h1','code','quote'].map(tag => (
                                            <button key={tag} onClick={() => insertTag(tag)} className="px-3 py-1 bg-black/40 rounded text-xs font-mono hover:bg-black/60">&lt;{tag}&gt;</button>
                                        ))}
                                    </div>
                                    <span className="text-[10px] uppercase opacity-50 bg-white/10 px-2 py-1 rounded">HTML + CSS Supported</span>
                                </div>
                                <textarea ref={contentRef} value={itemForm.content} onChange={e => setItemForm({...itemForm, content: e.target.value})} placeholder="Content... Use <style> for custom CSS (scoped automatically)" className="w-full h-64 bg-transparent outline-none text-sm font-mono text-zinc-300 resize-none"/>
                                <div className="text-[10px] text-yellow-500/60 mt-2 flex items-center gap-1">
                                    <AlertTriangle size={10} /> CSS is supported via &lt;style&gt; tags. Please avoid global selectors (like 'body') to prevent layout breakage.
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase opacity-50">Media</h4>
                                    <div className="flex gap-2"><input value={itemForm.image} onChange={e => setItemForm({...itemForm, image: e.target.value})} placeholder="Image URL" className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"/><label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"><Upload size={14}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'image')}/></label></div>
                                    <div className="flex gap-2"><input value={itemForm.fileUrl} onChange={e => setItemForm({...itemForm, fileUrl: e.target.value})} placeholder="File/Video URL" className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"/><label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"><Upload size={14}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'fileUrl')}/></label></div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase opacity-50">Item Styling</h4>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={itemForm.style?.titleColor} onChange={e => setItemForm({...itemForm, style: {...itemForm.style, titleColor: e.target.value}})} className="h-8 w-8 bg-transparent border-0 cursor-pointer"/>
                                        <span className="text-xs">Title Color</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={itemForm.style?.isGradient} onChange={e => setItemForm({...itemForm, style: {...itemForm.style, isGradient: e.target.checked}})} id="grad-check" className="cursor-pointer"/>
                                        <label htmlFor="grad-check" className="text-xs cursor-pointer">Enable Gradient Title</label>
                                    </div>
                                    {itemForm.style?.isGradient && (
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={itemForm.style?.titleColorEnd} onChange={e => setItemForm({...itemForm, style: {...itemForm.style, titleColorEnd: e.target.value}})} className="h-8 w-8 bg-transparent border-0 cursor-pointer"/>
                                            <span className="text-xs">Gradient End Color</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={itemForm.style?.contentColor} onChange={e => setItemForm({...itemForm, style: {...itemForm.style, contentColor: e.target.value}})} className="h-8 w-8 bg-transparent border-0 cursor-pointer"/>
                                        <span className="text-xs">Content Text Color</span>
                                    </div>
                                    <select value={itemForm.style?.fontFamily} onChange={e => setItemForm({...itemForm, style: {...itemForm.style, fontFamily: e.target.value as any}})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-xs">
                                        <option value="sans" className="bg-black">Sans Serif (Readable)</option>
                                        <option value="wizard" className="bg-black">Wizard Serif</option>
                                        <option value="muggle" className="bg-black">Muggle Mono</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleSaveItem} className="w-full py-4 bg-green-600 hover:bg-green-500 rounded font-bold text-lg shadow-lg">{isEditingItem ? 'UPDATE' : 'PUBLISH'}</button>
                        </div>

                        {/* Live Preview Column */}
                        <div className="flex-1 min-w-[300px] sticky top-4">
                            <h4 className="text-xs font-bold uppercase opacity-50 mb-4">Live Preview</h4>
                            <div className={`rounded-xl border backdrop-blur-md overflow-hidden p-6 shadow-2xl relative min-h-[300px]
                                ${isWizard ? 'bg-black/60 border-emerald-500/30' : 'bg-black/60 border-fuchsia-500/30'}
                            `}>
                                {itemForm.image && (
                                    <div className="absolute inset-0 z-0">
                                        <img src={itemForm.image} alt="Preview" className="w-full h-full object-cover opacity-30" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                                    </div>
                                )}
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 font-mono text-white">{itemForm.date}</span>
                                        {itemForm.isUnread && <div className={`w-2 h-2 rounded-full ${isWizard ? 'bg-emerald-400' : 'bg-fuchsia-400'}`}></div>}
                                    </div>
                                    <h2 
                                        className="text-3xl font-bold leading-tight mb-4 drop-shadow-md"
                                        style={previewTitleStyle}
                                    >
                                        {itemForm.title || "Untitled Item (Auto-extracted if empty)"}
                                    </h2>
                                    <div 
                                        className="text-sm font-sans leading-relaxed"
                                        style={{ color: itemForm.style?.contentColor }}
                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(itemForm.content || "Content preview...", { ADD_TAGS: ['style'] }) }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI LAB TAB */}
                {activeTab === 'ai-lab' && (
                    <div className="max-w-2xl mx-auto space-y-6 text-center">
                        <BrainCircuit size={48} className="mx-auto mb-4 text-purple-500" />
                        <h3 className="text-xl font-bold">The Oracle's Parser</h3>
                        
                        <textarea 
                            value={aiPrompt} 
                            onChange={(e) => setAiPrompt(e.target.value)} 
                            placeholder="Describe the item to generate, or upload an image/PDF..." 
                            className="w-full h-32 p-4 rounded bg-white/5 border border-white/10 outline-none"
                        />
                        
                        {/* File Upload UI */}
                        <div className="flex items-center gap-2 justify-center">
                            <label className={`px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 border border-dashed transition-all
                                ${selectedFile 
                                    ? 'bg-green-900/30 border-green-500 text-green-300' 
                                    : 'bg-white/5 border-white/20 text-white/50 hover:bg-white/10'}
                            `}>
                                <Upload size={16}/> 
                                {selectedFile ? selectedFile.name : "Attach Image/PDF Context"}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*,application/pdf"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                                />
                            </label>
                            {selectedFile && (
                                <button onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="p-2 hover:bg-red-900/50 text-red-400 rounded">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <button onClick={handleAiParse} disabled={aiLoading} className="px-8 py-3 rounded-full font-bold bg-purple-600 hover:bg-purple-500 w-full sm:w-auto">
                            {aiLoading ? <Loader2 className="animate-spin inline mr-2"/> : "ANALYZE & GENERATE"}
                        </button>
                        
                        {aiResult && (
                            <div className="mt-8 p-6 rounded bg-green-900/20 border border-green-500/30 text-left">
                                <pre className="text-xs overflow-x-auto bg-black/40 p-2 rounded mb-4 max-h-40">{JSON.stringify(aiResult, null, 2)}</pre>
                                <button onClick={transferAiToForm} className="w-full py-2 bg-green-600 hover:bg-green-500 rounded font-bold">USE THIS DATA</button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* SCHEDULER TAB */}
                {activeTab === 'scheduler' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="p-6 rounded bg-white/5 border border-white/10">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><CalendarDays size={20}/> Lecture Rules</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input value={newRule.subject} onChange={e => setNewRule({...newRule, subject: e.target.value})} placeholder="Subject Name" className="p-2 rounded bg-black/50 border border-white/10 outline-none" />
                                <input value={newRule.link} onChange={e => setNewRule({...newRule, link: e.target.value})} placeholder="Join Link" className="p-2 rounded bg-black/50 border border-white/10 outline-none" />
                                <div className="flex gap-2">
                                    <select value={newRule.dayOfWeek} onChange={e => setNewRule({...newRule, dayOfWeek: e.target.value})} className="flex-1 p-2 rounded bg-black/50 border border-white/10 outline-none">
                                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <input type="time" value={newRule.startTime} onChange={e => setNewRule({...newRule, startTime: e.target.value})} className="flex-1 p-2 rounded bg-black/50 border border-white/10 outline-none" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleAddRule} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded font-bold">ADD RULE</button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                {schedules.map(rule => (
                                    <div key={rule.id} className="p-3 rounded bg-black/30 border border-white/5 flex justify-between items-center">
                                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                            <span className="font-bold text-white">{rule.subject}</span>
                                            <span className="opacity-70">{rule.dayOfWeek} @ {rule.startTime}</span>
                                            <a href={rule.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">{rule.link}</a>
                                            <span className="opacity-50 capitalize">{rule.recurrence}</span>
                                        </div>
                                        <button onClick={() => handleDeleteRule(rule.id)} className="p-2 text-red-500 hover:bg-white/10 rounded"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                                {schedules.length === 0 && <div className="text-center opacity-50 text-xs">No active schedule rules.</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* BACKUP TAB */}
                {activeTab === 'backup' && (
                    <div className="max-w-xl mx-auto space-y-8 text-center pt-10">
                        <div className="p-8 border border-white/10 rounded-2xl bg-white/5">
                            <HardDrive size={48} className="mx-auto mb-4 text-blue-400" />
                            <h3 className="text-xl font-bold mb-2">System Backup</h3>
                            <p className="text-sm opacity-60 mb-6">Download a complete JSON snapshot of all items, settings, and logs.</p>
                            <button onClick={handleExportData} disabled={isLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded font-bold">
                                {isLoading ? <Loader2 className="animate-spin mx-auto"/> : 'EXPORT DATABASE'}
                            </button>
                        </div>

                        <div className="p-8 border border-red-500/30 rounded-2xl bg-red-900/10">
                            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
                            <h3 className="text-xl font-bold mb-2 text-red-200">System Restore</h3>
                            <p className="text-sm opacity-60 mb-6">Overwrite current database with a backup file. <b className="text-red-400">Irreversible.</b></p>
                            
                            <input 
                                type="file" 
                                ref={importFileRef}
                                onChange={handleImportData}
                                accept=".json"
                                className="hidden"
                            />
                            
                            <button 
                                onClick={() => importFileRef.current?.click()} 
                                disabled={isLoading} 
                                className="w-full py-3 border border-red-500 text-red-400 hover:bg-red-500/10 rounded font-bold"
                            >
                                {isLoading ? <Loader2 className="animate-spin mx-auto"/> : 'UPLOAD BACKUP FILE'}
                            </button>
                            
                            {importStatus && (
                                <div className="mt-4 text-xs font-mono bg-black/50 p-2 rounded">
                                    <div>{importStatus}</div>
                                    <div className="w-full bg-gray-700 h-1 mt-2 rounded overflow-hidden">
                                        <div className="bg-red-500 h-full transition-all duration-300" style={{width: `${importProgress}%`}}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VISITORS TAB */}
                {activeTab === 'visitors' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><ScanFace size={20}/> Recent Signals</h3>
                            <button onClick={fetchVisitors} className="p-2 hover:bg-white/10 rounded"><RefreshCw size={16}/></button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Visitor</th>
                                        <th className="p-3">Visits</th>
                                        <th className="p-3">Time</th>
                                        <th className="p-3">Last Active</th>
                                        <th className="p-3">IP Hash</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visitors.map((v) => (
                                        <tr key={v.visitor_id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-3 font-mono">{v.display_name}</td>
                                            <td className="p-3">{v.visit_count}</td>
                                            <td className="p-3">{(v.total_time_spent / 60).toFixed(1)}m</td>
                                            <td className="p-3 opacity-60">{new Date(v.last_active).toLocaleString()}</td>
                                            <td className="p-3 font-mono text-xs opacity-40">{v.ip_hash}</td>
                                        </tr>
                                    ))}
                                    {visitors.length === 0 && <tr><td colSpan={5} className="p-4 text-center opacity-50">No visitor data available.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* AUDIT LOGS TAB */}
                {activeTab === 'logs' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><Activity size={20}/> System Audit Logs</h3>
                            <button onClick={fetchAuditLogs} className="p-2 hover:bg-white/10 rounded"><RefreshCw size={16}/></button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Admin</th>
                                        <th className="p-3">Action</th>
                                        <th className="p-3">Details</th>
                                        <th className="p-3">Time</th>
                                        <th className="p-3">IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map((log) => (
                                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-3 font-bold text-blue-300">{log.username}</td>
                                            <td className="p-3 font-mono text-xs">{log.action}</td>
                                            <td className="p-3 opacity-80 max-w-xs truncate" title={log.details}>{log.details}</td>
                                            <td className="p-3 opacity-60 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-3 opacity-40 text-xs">{log.ip}</td>
                                        </tr>
                                    ))}
                                    {auditLogs.length === 0 && <tr><td colSpan={5} className="p-4 text-center opacity-50">No activity recorded.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* USERS TAB */}
                {activeTab === 'users' && (
                    <div className="max-w-2xl mx-auto space-y-8">
                        <div className="p-6 border border-white/10 rounded bg-white/5">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={18}/> Create Administrator</h3>
                            <div className="grid gap-4">
                                <input value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="Username" className="p-3 rounded bg-black border border-white/10 outline-none" />
                                <input value={newUserPass} onChange={e => setNewUserPass(e.target.value)} type="password" placeholder="Password" className="p-3 rounded bg-black border border-white/10 outline-none" />
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <label className="flex items-center gap-2 p-2 border border-white/10 rounded cursor-pointer hover:bg-white/5">
                                        <input type="checkbox" checked={newPermissions.canEdit} onChange={e => setNewPermissions({...newPermissions, canEdit: e.target.checked})} /> Can Edit Content
                                    </label>
                                    <label className="flex items-center gap-2 p-2 border border-white/10 rounded cursor-pointer hover:bg-white/5">
                                        <input type="checkbox" checked={newPermissions.canDelete} onChange={e => setNewPermissions({...newPermissions, canDelete: e.target.checked})} /> Can Delete Content
                                    </label>
                                    <label className="flex items-center gap-2 p-2 border border-white/10 rounded cursor-pointer hover:bg-white/5">
                                        <input type="checkbox" checked={newPermissions.canViewLogs} onChange={e => setNewPermissions({...newPermissions, canViewLogs: e.target.checked})} /> Can View Logs
                                    </label>
                                    <label className="flex items-center gap-2 p-2 border border-white/10 rounded cursor-pointer hover:bg-white/5">
                                        <input type="checkbox" checked={newPermissions.canManageUsers} onChange={e => setNewPermissions({...newPermissions, canManageUsers: e.target.checked})} /> Can Manage Users
                                    </label>
                                </div>
                                <button onClick={handleCreateUser} className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded font-bold">CREATE USER</button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-bold flex items-center gap-2"><Users size={18}/> Active Administrators</h3>
                            {users.map(u => (
                                <div key={u.username} className="p-4 border border-white/10 rounded flex justify-between items-center bg-black/40">
                                    <div className="flex items-center gap-3">
                                        <UserIcon role={u.permissions.isGod ? 'god' : 'admin'} />
                                        <div>
                                            <div className="font-bold">{u.username}</div>
                                            <div className="text-xs opacity-50 flex gap-2">
                                                {u.permissions.isGod ? 'GOD MODE' : [u.permissions.canEdit && 'Edit', u.permissions.canDelete && 'Del', u.permissions.canManageUsers && 'Mgmt'].filter(Boolean).join(', ')}
                                            </div>
                                        </div>
                                    </div>
                                    {!u.permissions.isGod && (
                                        <button onClick={() => handleDeleteUser(u.username)} className="p-2 text-red-500 hover:bg-red-900/20 rounded"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CONFIG TAB */}
                {activeTab === 'config' && (
                    <div className="max-w-3xl mx-auto space-y-6 pb-20">
                        <div className="p-6 border border-white/10 rounded bg-white/5 space-y-4">
                            <h3 className="font-bold flex items-center gap-2"><Settings size={18}/> Global Identity</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs opacity-50 mb-1 block">Wizard Title</label>
                                    <input value={editedConfig.wizardTitle} onChange={e => setEditedConfig({...editedConfig, wizardTitle: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs opacity-50 mb-1 block">Muggle Title</label>
                                    <input value={editedConfig.muggleTitle} onChange={e => setEditedConfig({...editedConfig, muggleTitle: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs opacity-50 mb-1 block">Wizard Gate Text</label>
                                    <input value={editedConfig.wizardGateText} onChange={e => setEditedConfig({...editedConfig, wizardGateText: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs opacity-50 mb-1 block">Muggle Gate Text</label>
                                    <input value={editedConfig.muggleGateText} onChange={e => setEditedConfig({...editedConfig, muggleGateText: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs opacity-50 mb-1 block">Telegram Link</label>
                                    <input value={editedConfig.telegramLink || ''} onChange={e => setEditedConfig({...editedConfig, telegramLink: e.target.value})} placeholder="https://t.me/..." className="w-full p-2 bg-black border border-white/10 rounded outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* NEW LOGO UPLOAD SECTION */}
                        <div className="p-6 border border-white/10 rounded bg-white/5 space-y-4">
                            <h3 className="font-bold flex items-center gap-2"><FileUp size={18}/> Custom Logos</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs opacity-50 mb-1 block">Wizard Mode Logo</label>
                                    <div className="flex gap-2">
                                        <input value={editedConfig.wizardLogoUrl || ''} onChange={e => setEditedConfig({...editedConfig, wizardLogoUrl: e.target.value})} placeholder="URL..." className="flex-1 p-2 bg-black border border-white/10 rounded outline-none" />
                                        <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"><Upload size={14}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'wizardLogoUrl')}/></label>
                                    </div>
                                    {editedConfig.wizardLogoUrl && <img src={editedConfig.wizardLogoUrl} alt="Preview" className="h-10 mt-2 object-contain" />}
                                </div>
                                <div>
                                    <label className="text-xs opacity-50 mb-1 block">Muggle Mode Logo</label>
                                    <div className="flex gap-2">
                                        <input value={editedConfig.muggleLogoUrl || ''} onChange={e => setEditedConfig({...editedConfig, muggleLogoUrl: e.target.value})} placeholder="URL..." className="flex-1 p-2 bg-black border border-white/10 rounded outline-none" />
                                        <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"><Upload size={14}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'muggleLogoUrl')}/></label>
                                    </div>
                                    {editedConfig.muggleLogoUrl && <img src={editedConfig.muggleLogoUrl} alt="Preview" className="h-10 mt-2 object-contain" />}
                                </div>
                             </div>
                        </div>

                        <div className="p-6 border border-white/10 rounded bg-white/5 space-y-4">
                            <h3 className="font-bold flex items-center gap-2"><ImageIcon size={18}/> Assets & Media</h3>
                            <div className="grid gap-4">
                                <div>
                                    <label className="text-xs opacity-50 mb-1 block">Wizard Background URL</label>
                                    <div className="flex gap-2">
                                        <input value={editedConfig.wizardImage} onChange={e => setEditedConfig({...editedConfig, wizardImage: e.target.value})} className="flex-1 p-2 bg-black border border-white/10 rounded outline-none" />
                                        <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"><Upload size={14}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'wizardImage')}/></label>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs opacity-50 mb-1 block">Muggle Background URL</label>
                                    <div className="flex gap-2">
                                        <input value={editedConfig.muggleImage} onChange={e => setEditedConfig({...editedConfig, muggleImage: e.target.value})} className="flex-1 p-2 bg-black border border-white/10 rounded outline-none" />
                                        <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"><Upload size={14}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'muggleImage')}/></label>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs opacity-50 mb-1 block">Cursor Style</label>
                                    <select value={editedConfig.cursorStyle || 'classic'} onChange={e => setEditedConfig({...editedConfig, cursorStyle: e.target.value as any})} className="w-full p-2 bg-black border border-white/10 rounded outline-none">
                                        <option value="classic">Classic (Quill / Crosshair)</option>
                                        <option value="minimal">Minimal (Dot / Square)</option>
                                        <option value="blade">Blade (Sharp)</option>
                                        <option value="enchanted">Enchanted (Glowing)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-4 sticky bottom-0 bg-black/80 backdrop-blur p-4 border-t border-white/10 -mx-4 -mb-4 sm:mx-0 sm:mb-0 sm:rounded-b-xl z-10">
                            <button onClick={onClearData} className="px-6 py-3 border border-red-500 text-red-500 rounded font-bold hover:bg-red-900/10 transition-colors">RESET LOCAL</button>
                            <button 
                                onClick={handleSaveConfig} 
                                disabled={isSavingConfig}
                                className={`px-6 py-3 rounded font-bold shadow-lg flex items-center gap-2 transition-all
                                    ${isSavingConfig ? 'bg-blue-800 text-white/50 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 hover:scale-105'}
                                `}
                            >
                                {isSavingConfig ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                {isSavingConfig ? 'SAVING...' : 'SAVE CONFIGURATION'}
                            </button>
                        </div>
                    </div>
                )}

                {/* SECTORS TAB */}
                {activeTab === 'structure' && (
                    <div className="space-y-4">
                        {editedSectors.map((sector, idx) => (
                            <div key={sector.id} className="p-4 border border-white/10 rounded bg-white/5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                                    <input value={sector.wizardName} onChange={(e) => handleUpdateSector(idx, 'wizardName', e.target.value)} className="p-2 bg-black border border-white/10 rounded outline-none" placeholder="Wizard Name" />
                                    <input value={sector.muggleName} onChange={(e) => handleUpdateSector(idx, 'muggleName', e.target.value)} className="p-2 bg-black border border-white/10 rounded outline-none" placeholder="Muggle Name" />
                                    <input value={sector.description} onChange={(e) => handleUpdateSector(idx, 'description', e.target.value)} className="p-2 bg-black border border-white/10 rounded outline-none" placeholder="Description" />
                                </div>
                                <div className="text-xs opacity-50 font-mono">{sector.id}</div>
                            </div>
                        ))}
                        <button onClick={handleSaveSectors} className="w-full py-4 bg-green-600 hover:bg-green-500 rounded font-bold shadow-lg">UPDATE STRUCTURE</button>
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
