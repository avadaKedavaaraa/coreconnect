import React, { useState, useEffect, useRef } from 'react';
import { Lineage, Sector, CarouselItem, AdminPermissions, GlobalConfig, LectureRule, VisitorLog, AdminUser, AuditLog, FONT_LIBRARY } from '../types';
import { API_URL } from '../lib/config';
import { 
  X, Unlock, Lock, Loader2, Database, PenTool, CalendarDays, HardDrive, 
  BrainCircuit, ScanFace, Users, Activity, Settings, LayoutTemplate, Search, 
  Filter, Replace, Edit3, Trash2, Plus, Upload, ImageIcon, Save, Shield, 
  ShieldAlert, FileUp, AlertTriangle, RefreshCw, Key, Type, Link as LinkIcon, Share2, FileText, Pin, ArrowDownUp, SortAsc, SortDesc, Sparkles, FolderInput, AlertCircle, Wand2, Check, GripVertical, File, Eye, MessageSquare, Smartphone, Monitor, BellRing, Layers, ImagePlus, Clock, Calendar
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

const loadFontPreview = (fontId: string) => {
    const font = FONT_LIBRARY.find(f => f.id === fontId);
    if (!font) return;
    const linkId = `font-admin-preview-${font.id}`;
    if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.href = `https://fonts.googleapis.com/css2?family=${font.name.replace(/ /g, '+')}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
};

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
      type: 'announcement', sector: defaultSector, subject: 'General', isUnread: true, isPinned: false, likes: 0,
      fileUrl: '',
      image: '',
      images: [], // Init gallery array
      style: { titleColor: '#ffffff', titleColorEnd: '', contentColor: '#e4e4e7', fontFamily: 'sans', isGradient: false }
  });
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isCustomSubject, setIsCustomSubject] = useState(false); 
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [galleryUploading, setGalleryUploading] = useState(false);
  
  // Drive Import State
  const [driveLink, setDriveLink] = useState('');
  const [driveSubject, setDriveSubject] = useState('');
  const [driveSector, setDriveSector] = useState(defaultSector);
  const [driveImportStatus, setDriveImportStatus] = useState('');
  const [driveImportLoading, setDriveImportLoading] = useState(false);
  const [driveIsCustomSubject, setDriveIsCustomSubject] = useState(false); 

  // Scheduler Tab State
  const [schedules, setSchedules] = useState<LectureRule[]>(globalConfig.schedules || []);
  // UPDATED: ruleForm now supports multi-day, ranges, and edits
  const [ruleForm, setRuleForm] = useState<LectureRule>({
      id: '', 
      subject: '', 
      days: [], // Multi-day support
      startTime: '10:00', 
      endTime: '',
      startDate: '',
      endDate: '',
      link: '', 
      recurrence: 'weekly', 
      isActive: true, 
      batch: 'AICS'
  });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Config Tab State
  const [editedConfig, setEditedConfig] = useState<GlobalConfig>(globalConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Structure Tab State
  const [editedSectors, setEditedSectors] = useState<Sector[]>(sectors);
  const [isSavingSectors, setIsSavingSectors] = useState(false);
  const [sectorSaveStatus, setSectorSaveStatus] = useState('');

  // Users Tab State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newUser, setNewUser] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newPermissions, setNewPermissions] = useState<AdminPermissions>({ canEdit: false, canDelete: false, canManageUsers: false, canViewLogs: false, isGod: false });
  const [changePassData, setChangePassData] = useState({ current: '', new: '', confirm: '' });

  // Logs/Visitors Tab State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorLog | null>(null);
  const [visitorDetails, setVisitorDetails] = useState<{activity: any[], chats: any[]} | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
          if(initialEditingItem.style?.fontFamily) loadFontPreview(initialEditingItem.style.fontFamily);
          setIsEditingItem(true);
          setActiveTab('creator');
      } else {
          resetItemForm();
      }
  }, [initialEditingItem, isOpen]);

  // Sync config when panel opens
  useEffect(() => {
      if (isOpen) {
          setEditedConfig(globalConfig);
          setSchedules(globalConfig.schedules || []);
          setEditedSectors(sectors);
      }
  }, [isOpen, globalConfig, sectors]); 

  useEffect(() => {
      if(activeTab === 'users' && isAdmin) fetchUsers();
      if(activeTab === 'visitors' && isAdmin) fetchVisitors();
      if(activeTab === 'logs' && isAdmin) fetchAuditLogs();
  }, [activeTab, isAdmin]);

  const resetItemForm = () => {
      setItemForm({
          id: crypto.randomUUID(), title: '', content: '', date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
          type: 'announcement', sector: defaultSector, subject: 'General', isUnread: true, isPinned: false, likes: 0,
          fileUrl: '',
          image: '',
          images: [],
          style: { titleColor: '#ffffff', titleColorEnd: '', contentColor: '#e4e4e7', fontFamily: 'sans', isGradient: false }
      });
      setIsEditingItem(false);
      setIsCustomSubject(false);
  };

  // UPDATED: Reset Rule Form
  const resetRuleForm = () => {
      setRuleForm({
          id: '', subject: '', days: [], startTime: '10:00', endTime: '', startDate: '', endDate: '', link: '', recurrence: 'weekly', isActive: true, batch: 'AICS', image: '', customMessage: ''
      });
      setEditingRuleId(null);
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
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Server Error (${res.status}). Connection failed.`); }

      if (!res.ok) throw new Error(data.error || 'Authentication Failed');
      onLogin(data.csrfToken, data.permissions);
      setLoginPass(''); setLoginUser('');
    } catch (err: any) { setError(err.message || 'Login Failed'); } 
    finally { setIsLoading(false); }
  };

  const fetchUsers = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/users`, { headers: { 'x-csrf-token': csrfToken }, credentials: 'include' });
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
              body: JSON.stringify({ username: newUser, password: newUserPass, permissions: newPermissions }),
              credentials: 'include'
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
              body: JSON.stringify({ targetUser: username }),
              credentials: 'include'
          });
          if(res.ok) fetchUsers();
          else { const d = await res.json(); alert(d.error); }
      } catch(e) {}
  };

  const handleChangePassword = async () => {
      if (!changePassData.current || !changePassData.new || !changePassData.confirm) {
          alert("Please fill all password fields.");
          return;
      }
      if (changePassData.new !== changePassData.confirm) {
          alert("New passwords do not match.");
          return;
      }
      setIsLoading(true);
      try {
          const res = await fetch(`${API_URL}/api/admin/change-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
              body: JSON.stringify({ 
                  currentPassword: changePassData.current, 
                  newPassword: changePassData.new 
              }),
              credentials: 'include'
          });
          const data = await res.json();
          if (res.ok) {
              alert("Password changed successfully.");
              setChangePassData({ current: '', new: '', confirm: '' });
          } else {
              alert(data.error || "Failed to change password.");
          }
      } catch (e) {
          alert("Network error.");
      } finally {
          setIsLoading(false);
      }
  };

  const fetchVisitors = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/visitors`, { headers: { 'x-csrf-token': csrfToken }, credentials: 'include' });
          const data = await res.json();
          if(res.ok) setVisitors(data);
      } catch(e) {}
  };

  const fetchVisitorDetails = async (visitorId: string) => {
      setLoadingDetails(true);
      setVisitorDetails(null);
      try {
          const res = await fetch(`${API_URL}/api/admin/visitor-details/${visitorId}`, { 
              headers: { 'x-csrf-token': csrfToken }, 
              credentials: 'include' 
          });
          const data = await res.json();
          if(res.ok) setVisitorDetails(data);
      } catch(e) {} finally { setLoadingDetails(false); }
  };

  const handleVisitorSelect = (visitor: VisitorLog) => {
      setSelectedVisitor(visitor);
      fetchVisitorDetails(visitor.visitor_id);
  };

  const fetchAuditLogs = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/logs`, { headers: { 'x-csrf-token': csrfToken }, credentials: 'include' });
          const data = await res.json();
          if(res.ok) setAuditLogs(data);
      } catch(e) {}
  };

  // --- CREATOR LOGIC ---
  const handleSaveItem = () => {
      const itemToSave = { ...itemForm };

      // Auto-extract title if missing
      if (!itemToSave.title) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(itemToSave.content, 'text/html');
          const h1 = doc.querySelector('h1');
          const strong = doc.querySelector('strong');
          const firstLine = doc.body.textContent?.split('\n')[0];
          let extractedTitle = h1?.textContent || strong?.textContent || firstLine || 'Untitled Item';
          if (extractedTitle.length > 50) extractedTitle = extractedTitle.substring(0, 50) + '...';
          itemToSave.title = extractedTitle;
      }
      
      if (isEditingItem) {
          onUpdateItem(itemToSave);
      } else {
          onAddItem({...itemToSave, id: crypto.randomUUID()});
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

  // Single file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'fileUrl' | 'wizardLogoUrl' | 'muggleLogoUrl' | 'wizardImage' | 'muggleImage') => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
          const res = await fetch(`${API_URL}/api/admin/upload`, {
              method: 'POST',
              headers: { 'x-csrf-token': csrfToken },
              body: formData,
              credentials: 'include'
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

  // Multi-file upload for Gallery
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setGalleryUploading(true);
      const newUrls: string[] = [];

      try {
          // Upload sequentially to ensure order (or parallel for speed, sequential is safer for simple logic)
          for (let i = 0; i < files.length; i++) {
              const formData = new FormData();
              formData.append('file', files[i]);
              
              const res = await fetch(`${API_URL}/api/admin/upload`, {
                  method: 'POST',
                  headers: { 'x-csrf-token': csrfToken },
                  body: formData,
                  credentials: 'include'
              });
              
              const data = await res.json();
              if (res.ok && data.url) {
                  newUrls.push(data.url);
              }
          }
          
          if (newUrls.length > 0) {
              setItemForm(prev => ({
                  ...prev,
                  images: [...(prev.images || []), ...newUrls]
              }));
          }
      } catch (e) {
          alert("Gallery upload partially failed.");
      } finally {
          setGalleryUploading(false);
          // Reset input
          e.target.value = ''; 
      }
  };

  const removeGalleryImage = (indexToRemove: number) => {
      setItemForm(prev => ({
          ...prev,
          images: (prev.images || []).filter((_, idx) => idx !== indexToRemove)
      }));
  };

  // --- DRIVE IMPORT LOGIC ---
  const handleDriveImport = async () => {
      if (!driveLink) return;
      setDriveImportLoading(true);
      setDriveImportStatus('Initializing scan...');
      
      try {
          const res = await fetch(`${API_URL}/api/admin/drive-scan`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'x-csrf-token': csrfToken 
              },
              body: JSON.stringify({ 
                  folderLink: driveLink,
                  sector: driveSector,
                  subject: driveSubject || 'Imported Drive Files'
              }),
              credentials: 'include'
          });

          const data = await res.json();

          if (!res.ok) {
              throw new Error(data.error || `Error ${res.status}: Failed to scan Drive.`);
          }

          if (data.items && Array.isArray(data.items)) {
              setDriveImportStatus(`Found ${data.items.length} files. Creating items...`);
              data.items.forEach((newItem: CarouselItem) => onAddItem(newItem));
              setDriveImportStatus(`Success! Imported ${data.items.length} files.`);
              setTimeout(() => {
                  setDriveImportStatus('');
                  setDriveLink('');
              }, 3000);
          } else {
              setDriveImportStatus('No files found or folder is empty/private.');
          }

      } catch (e: any) {
          setDriveImportStatus('');
          alert(`Drive Import Failed:\n${e.message}`);
      } finally {
          setDriveImportLoading(false);
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

  // --- SCHEDULER LOGIC (UPDATED V2.5) ---
  const handleSaveRule = () => {
      if(!ruleForm.subject) return;

      if (editingRuleId) {
          // UPDATE MODE
          const updatedSchedules = schedules.map(s => s.id === editingRuleId ? { ...ruleForm, id: editingRuleId } : s);
          setSchedules(updatedSchedules);
          setEditedConfig({ ...editedConfig, schedules: updatedSchedules });
      } else {
          // CREATE MODE
          const rule: LectureRule = { ...ruleForm, id: crypto.randomUUID() };
          const updated = [...schedules, rule];
          setSchedules(updated);
          setEditedConfig({ ...editedConfig, schedules: updated });
      }
      resetRuleForm();
  };

  const handleEditRule = (rule: LectureRule) => {
      setRuleForm(rule);
      setEditingRuleId(rule.id);
      // Scroll to top of scheduler form
      const formEl = document.getElementById('scheduler-form');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteRule = (id: string) => {
      if (!confirm("Are you sure you want to remove this class schedule?")) return;
      const updated = schedules.filter(s => s.id !== id);
      setSchedules(updated);
      setEditedConfig({ ...editedConfig, schedules: updated });
      if (editingRuleId === id) resetRuleForm();
  };

  const toggleDay = (day: string) => {
      const currentDays = ruleForm.days || [];
      if (currentDays.includes(day)) {
          setRuleForm({ ...ruleForm, days: currentDays.filter(d => d !== day) });
      } else {
          setRuleForm({ ...ruleForm, days: [...currentDays, day] });
      }
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
              body: formData,
              credentials: 'include'
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
          await onUpdateConfig({ ...editedConfig, schedules });
      } finally {
          setIsSavingConfig(false);
      }
  };

  // --- STRUCTURE LOGIC ---
  const handleUpdateSector = (idx: number, field: keyof Sector, value: string) => {
      const updated = [...editedSectors];
      // @ts-ignore
      updated[idx] = { ...updated[idx], [field]: value };
      setEditedSectors(updated);
  };

  const handleSaveSectors = async () => {
      setIsSavingSectors(true);
      setSectorSaveStatus('');
      try {
          await onUpdateSectors(editedSectors);
          setSectorSaveStatus('success');
          setTimeout(() => setSectorSaveStatus(''), 3000);
      } catch (e) {
          setSectorSaveStatus('error');
      } finally {
          setIsSavingSectors(false);
      }
  };

  // --- EXPORT/IMPORT ---
  const handleExportData = async () => {
      setIsLoading(true);
      try {
          const [logsRes, visitorsRes] = await Promise.all([
              fetch(`${API_URL}/api/admin/logs`, { headers: { 'x-csrf-token': csrfToken }, credentials: 'include' }).catch(() => ({ ok: false, json: async () => [] })),
              fetch(`${API_URL}/api/admin/visitors`, { headers: { 'x-csrf-token': csrfToken }, credentials: 'include' }).catch(() => ({ ok: false, json: async () => [] }))
          ]);
          
          const logs = logsRes.ok ? await logsRes.json() : [];
          const visitors = visitorsRes.ok ? await visitorsRes.json() : [];

          const backup = { 
              data: { 
                  items: allItems, 
                  global_config: [editedConfig], 
                  sectors: editedSectors, 
                  visitor_logs: Array.isArray(visitors) ? visitors : [],
                  audit_logs: Array.isArray(logs) ? logs : []
              }, 
              timestamp: new Date().toISOString(),
              version: "2.5"
          };
          
          const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `core_connect_backup_${new Date().toISOString().split('T')[0]}.json`;
          a.click();
      } catch (e) { alert("Export failed partially. Check console."); } finally { setIsLoading(false); }
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
                  body: JSON.stringify(json),
                  credentials: 'include'
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
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const selectedFont = FONT_LIBRARY.find(f => f.id === itemForm.style?.fontFamily);
  const previewTitleStyle = itemForm.style?.isGradient ? {
        backgroundImage: `linear-gradient(to right, ${itemForm.style.titleColor}, ${itemForm.style.titleColorEnd || itemForm.style.titleColor})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        color: 'transparent',
        fontFamily: selectedFont?.family
    } : {
        color: itemForm.style?.titleColor,
        fontFamily: selectedFont?.family
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
             {/* Login Form */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                <div className={`w-[600px] h-[600px] border-[2px] rounded-full absolute animate-spin-slow ${isWizard ? 'border-red-600/20' : 'border-blue-600/20'}`}></div>
                <div className={`w-[500px] h-[500px] border-[4px] border-dashed rounded-full absolute animate-reverse-spin ${isWizard ? 'border-red-500/30' : 'border-blue-500/30'}`}></div>
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

            <main className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-8 relative custom-scrollbar pb-24">
                            {/* DATABASE TAB */}
                            {activeTab === 'database' && (
                                <div className="space-y-6">
                                    {/* Search & Filters */}
                                    <div className="flex gap-4">
                                        <div className="flex-1 relative">
                                            <Search className="absolute left-3 top-3 text-white/50" size={18} />
                                            <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search DB..." className="w-full pl-10 p-3 bg-white/5 border border-white/10 rounded outline-none" />
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Filter size={14} /></div>
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
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Replace size={14} /></div>
                                            <input value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find..." className="h-full pl-9 p-3 bg-white/5 border border-white/10 rounded outline-none w-32 focus:w-48 transition-all" />
                                            {findText && <button onClick={scanForMatches} className="absolute right-2 top-2 p-1 bg-white/10 rounded hover:bg-white/20"><Search size={14} /></button>}
                                        </div>
                                    </div>

                                    {foundMatches.length > 0 && (
                                        <div className="p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-yellow-200 font-bold">Found {foundMatches.length} occurrences of "{findText}"</span>
                                                <div className="flex gap-2">
                                                    <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace with..." className="p-1 px-2 bg-black/50 border border-yellow-500/30 rounded text-sm text-white" />
                                                    <button onClick={executeReplaceAll} className="px-3 py-1 bg-yellow-600 rounded text-black font-bold text-xs hover:bg-yellow-500">REPLACE ALL</button>
                                                    <button onClick={() => setFoundMatches([])} className="p-1 hover:bg-white/10 rounded"><X size={14} /></button>
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
                                                        <div className="flex items-center gap-2">
                                                            {item.isPinned && <Pin size={12} className="text-yellow-500 fill-yellow-500" />}
                                                            <div className="font-bold" style={listTitleStyle}>{item.title}</div>
                                                        </div>
                                                        <div className="text-xs opacity-50 flex gap-2">
                                                            <span>{item.date}</span> • <span>{item.type}</span> • <span>{item.sector}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => startEditItem(item)} className="p-2 bg-blue-600 rounded hover:bg-blue-500"><Edit3 size={16} /></button>
                                                        <button onClick={() => { if (confirm('Delete?')) onDeleteItem(item.id) }} className="p-2 bg-red-600 rounded hover:bg-red-500"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {filteredItems.length === 0 && <div className="text-center opacity-50 py-10">No items found</div>}
                                    </div>
                                </div>
                            )}

                            {/* CREATOR TAB */}
                            {activeTab === 'creator' && (
                                <div className="flex flex-col xl:flex-row gap-8 xl:h-full">
                                    {/* Editor Column */}
                                    <div className="flex-1 space-y-6 max-w-2xl xl:overflow-y-auto">

                                        {/* GOOGLE DRIVE FOLDER IMPORT SECTION */}
                                        <div className={`p-6 rounded-xl border-2 border-dashed relative overflow-hidden transition-colors ${isWizard ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-fuchsia-500/30 bg-fuchsia-950/10'}`}>
                                            <div className="flex items-center justify-between mb-4 relative z-10">
                                                <div className="flex items-center gap-2">
                                                    <FolderInput className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} size={24} />
                                                    <div>
                                                        <h3 className="font-bold">Google Drive Import</h3>
                                                        <p className="text-xs opacity-60">Paste a Public Folder Link to auto-fetch PDFs.</p>
                                                    </div>
                                                </div>
                                                {driveImportLoading && <Loader2 className="animate-spin text-white/50" />}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                                <div className="md:col-span-2">
                                                    <input
                                                        value={driveLink}
                                                        onChange={(e) => setDriveLink(e.target.value)}
                                                        placeholder="https://drive.google.com/drive/folders/..."
                                                        className="w-full p-3 bg-black/50 border border-white/10 rounded outline-none text-sm text-white"
                                                    />
                                                </div>
                                                <select
                                                    value={driveSector}
                                                    onChange={(e) => setDriveSector(e.target.value)}
                                                    className="p-3 bg-black/50 border border-white/10 rounded text-white text-xs outline-none"
                                                >
                                                    {sectors.map(s => <option key={s.id} value={s.id} className="bg-black">{s.muggleName}</option>)}
                                                </select>

                                                {/* Subject Selector for Drive Import */}
                                                <div className="relative">
                                                    <select
                                                        value={driveIsCustomSubject ? '__NEW__' : driveSubject}
                                                        onChange={(e) => {
                                                            if (e.target.value === '__NEW__') {
                                                                setDriveIsCustomSubject(true);
                                                                setDriveSubject('');
                                                            } else {
                                                                setDriveIsCustomSubject(false);
                                                                setDriveSubject(e.target.value);
                                                            }
                                                        }}
                                                        className="w-full p-3 bg-black/50 border border-white/10 rounded text-white text-xs outline-none appearance-none"
                                                    >
                                                        <option value="" className="bg-black">-- Select Existing Subject --</option>
                                                        {uniqueSubjects.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                                                        <option value="__NEW__" className="bg-blue-900 font-bold">+ Create New Subject</option>
                                                    </select>
                                                </div>

                                                {driveIsCustomSubject && (
                                                    <input
                                                        value={driveSubject}
                                                        onChange={(e) => setDriveSubject(e.target.value)}
                                                        placeholder="Enter New Subject Name..."
                                                        className="p-3 bg-blue-900/20 border border-blue-500/50 rounded outline-none text-xs text-white"
                                                        autoFocus
                                                    />
                                                )}
                                            </div>

                                            {driveImportStatus && (
                                                <div className={`mt-3 text-xs font-mono p-2 rounded border flex items-center gap-2 ${driveImportStatus.includes('Error') || driveImportStatus.includes('Failed') ? 'border-red-500/50 bg-red-900/20 text-red-200' : 'border-green-500/50 bg-green-900/20 text-green-200'}`}>
                                                    <AlertCircle size={12} /> {driveImportStatus}
                                                </div>
                                            )}

                                            <div className="mt-4 flex justify-end relative z-10">
                                                <button
                                                    onClick={handleDriveImport}
                                                    disabled={driveImportLoading || !driveLink}
                                                    className={`px-6 py-2 rounded font-bold text-xs flex items-center gap-2 transition-all ${driveImportLoading ? 'opacity-50' : 'hover:scale-105'} ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}
                                                >
                                                    {driveImportLoading ? 'Scanning...' : 'FETCH & CREATE ITEMS'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-white/10 my-4"></div>

                                        {/* ... same editor inputs ... */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <input value={itemForm.title} onChange={e => setItemForm({ ...itemForm, title: e.target.value })} placeholder="Title (Leave empty to auto-extract from HTML)" className="col-span-2 p-3 bg-white/5 border border-white/10 rounded text-white outline-none" />
                                            <select value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value as any })} className="p-3 bg-white/5 border border-white/10 rounded text-white outline-none">
                                                <option value="announcement" className="bg-black">Announcement</option>
                                                <option value="file" className="bg-black">File</option>
                                                <option value="video" className="bg-black">Video</option>
                                                <option value="task" className="bg-black">Task / Tutorial</option>
                                                <option value="mixed" className="bg-black">Mixed Content</option>
                                                <option value="link" className="bg-black">External Link</option>
                                                <option value="code" className="bg-black">Code Snippet</option>
                                            </select>
                                            <select value={itemForm.sector} onChange={e => setItemForm({ ...itemForm, sector: e.target.value })} className="p-3 bg-white/5 border border-white/10 rounded text-white outline-none">
                                                {sectors.map(s => <option key={s.id} value={s.id} className="bg-black">{isWizard ? s.wizardName : s.muggleName}</option>)}
                                            </select>
                                            <input type="date" value={itemForm.date} onChange={e => setItemForm({ ...itemForm, date: e.target.value })} className="p-3 bg-white/5 border border-white/10 rounded text-white outline-none" />

                                            {/* Subject Selector - Enhanced */}
                                            <div className="relative">
                                                <select
                                                    value={isCustomSubject ? '__NEW__' : itemForm.subject}
                                                    onChange={(e) => {
                                                        if (e.target.value === '__NEW__') {
                                                            setIsCustomSubject(true);
                                                            setItemForm({ ...itemForm, subject: '' });
                                                        } else {
                                                            setIsCustomSubject(false);
                                                            setItemForm({ ...itemForm, subject: e.target.value });
                                                        }
                                                    }}
                                                    className="w-full p-3 bg-white/5 border border-white/10 rounded text-white outline-none appearance-none"
                                                >
                                                    <option value="" className="bg-black">-- Select Subject --</option>
                                                    {uniqueSubjects.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                                                    <option value="__NEW__" className="bg-blue-900 font-bold">+ Create New Subject</option>
                                                </select>
                                            </div>
                                            {isCustomSubject && (
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={itemForm.subject}
                                                    onChange={(e) => setItemForm({ ...itemForm, subject: e.target.value })}
                                                    placeholder="Enter New Subject Name..."
                                                    className="col-span-2 p-3 bg-blue-900/20 border border-blue-500/50 rounded text-blue-200 outline-none placeholder:text-blue-200/50 animate-[fade-in_0.2s]"
                                                />
                                            )}
                                        </div>

                                        <div className="p-4 rounded border border-white/10 bg-white/5">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                    {['b', 'i', 'u', 'h1', 'code', 'quote'].map(tag => (
                                                        <button key={tag} onClick={() => insertTag(tag)} className="px-3 py-1 bg-black/40 rounded text-xs font-mono hover:bg-black/60">&lt;{tag}&gt;</button>
                                                    ))}
                                                </div>
                                                <span className="text-[10px] uppercase opacity-50 bg-white/10 px-2 py-1 rounded">HTML + CSS Supported</span>
                                            </div>
                                            <textarea ref={contentRef} value={itemForm.content} onChange={e => setItemForm({ ...itemForm, content: e.target.value })} placeholder="Content... Use <style> for custom CSS (scoped automatically)" className="w-full h-64 bg-transparent outline-none text-sm font-mono text-zinc-300 resize-none" />
                                            <div className="text-[10px] text-yellow-500/60 mt-2 flex items-center gap-1">
                                                <AlertTriangle size={10} /> CSS is supported via &lt;style&gt; tags. Please avoid global selectors (like 'body') to prevent layout breakage.
                                            </div>
                                        </div>

                                        {/* DEDICATED GOOGLE DRIVE PANEL */}
                                        <div className={`p-4 rounded-xl border-2 border-dashed ${isWizard ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-fuchsia-500/30 bg-fuchsia-950/10'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Share2 className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} size={20} />
                                                <h4 className={`font-bold ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>Cloud Resource Link</h4>
                                            </div>
                                            <p className="text-xs opacity-60 mb-3">
                                                Paste a Google Drive (or other cloud) link here. This will be securely stored in the Registry and attached to the item.
                                            </p>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <LinkIcon className="absolute left-3 top-3 text-white/30" size={16} />
                                                    <input
                                                        value={itemForm.fileUrl || ''}
                                                        onChange={e => setItemForm({ ...itemForm, fileUrl: e.target.value })}
                                                        placeholder="https://drive.google.com/file/d/..."
                                                        className="w-full pl-10 p-3 bg-black/50 border border-white/10 rounded outline-none text-sm text-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* LOCAL MEDIA & GALLERY */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold uppercase opacity-50">Visual Assets</h4>

                                                {/* Cover Image Upload */}
                                                <div className="flex gap-2">
                                                    <input
                                                        value={itemForm.image}
                                                        onChange={e => setItemForm({ ...itemForm, image: e.target.value })}
                                                        placeholder="Cover Image URL"
                                                        className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"
                                                    />
                                                    <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20" title="Upload Image">
                                                        <ImageIcon size={14} />
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
                                                    </label>
                                                </div>

                                                {/* GALLERY UPLOAD - NEW */}
                                                <div className="space-y-2">
                                                    <label className="text-xs opacity-50 block">Gallery Images (Multiple)</label>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1 border border-white/10 rounded p-2 bg-white/5 flex items-center gap-2 overflow-x-auto">
                                                            {itemForm.images && itemForm.images.length > 0 ? (
                                                                itemForm.images.map((img, idx) => (
                                                                    <div key={idx} className="relative w-8 h-8 shrink-0 group">
                                                                        <img src={img} className="w-full h-full object-cover rounded" />
                                                                        <button 
                                                                            onClick={() => removeGalleryImage(idx)}
                                                                            className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <X size={8} />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-[10px] opacity-30 italic">No gallery images</span>
                                                            )}
                                                        </div>
                                                        <label className={`p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20 ${galleryUploading ? 'opacity-50 pointer-events-none' : ''}`} title="Upload Multiple Images">
                                                            {galleryUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                                                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleGalleryUpload} />
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* File Attachment Upload */}
                                                <div className="flex gap-2">
                                                    <input
                                                        value={itemForm.fileUrl || ''}
                                                        onChange={e => setItemForm({ ...itemForm, fileUrl: e.target.value })}
                                                        placeholder="Attachment URL (PDF, Video...)"
                                                        className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"
                                                    />
                                                    <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20" title="Upload File (PDF/Video)">
                                                        <FileText size={14} />
                                                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'fileUrl')} />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold uppercase opacity-50">Item Styling & Props</h4>

                                                {/* Title Color */}
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={itemForm.style?.titleColor || '#ffffff'} onChange={e => setItemForm({ ...itemForm, style: { ...itemForm.style, titleColor: e.target.value } })} className="h-8 w-8 bg-transparent border-0 cursor-pointer" />
                                                    <span className="text-xs">Title Color {itemForm.style?.isGradient ? '(Start)' : ''}</span>
                                                </div>

                                                {/* Gradient Toggle */}
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={itemForm.style?.isGradient || false} onChange={e => setItemForm({ ...itemForm, style: { ...itemForm.style, isGradient: e.target.checked } })} id="grad-check" className="cursor-pointer" />
                                                    <label htmlFor="grad-check" className="text-xs cursor-pointer">Enable Gradient Title</label>
                                                </div>

                                                {/* Gradient End Color - NEW */}
                                                {itemForm.style?.isGradient && (
                                                    <div className="flex items-center gap-2 animate-[fade-in_0.2s]">
                                                        <input type="color" value={itemForm.style?.titleColorEnd || itemForm.style?.titleColor || '#ffffff'} onChange={e => setItemForm({ ...itemForm, style: { ...itemForm.style, titleColorEnd: e.target.value } })} className="h-8 w-8 bg-transparent border-0 cursor-pointer" />
                                                        <span className="text-xs">Title Gradient End Color</span>
                                                    </div>
                                                )}

                                                {/* Body Content Color - NEW */}
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={itemForm.style?.contentColor || '#e4e4e7'} onChange={e => setItemForm({ ...itemForm, style: { ...itemForm.style, contentColor: e.target.value } })} className="h-8 w-8 bg-transparent border-0 cursor-pointer" />
                                                    <span className="text-xs">Body Content Color</span>
                                                </div>

                                                <div className="w-full h-px bg-white/10 my-2"></div>

                                                <div className="flex items-center gap-2 border border-white/10 p-2 rounded bg-white/5">
                                                    <input type="checkbox" checked={itemForm.isPinned} onChange={e => setItemForm({ ...itemForm, isPinned: e.target.checked })} id="pin-check" className="cursor-pointer" />
                                                    <label htmlFor="pin-check" className="text-xs cursor-pointer flex items-center gap-2 font-bold text-yellow-300">
                                                        <Pin size={12} fill="currentColor" /> Pin to Top
                                                    </label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={itemForm.isUnread} onChange={e => setItemForm({ ...itemForm, isUnread: e.target.checked })} id="unread-check" className="cursor-pointer" />
                                                    <label htmlFor="unread-check" className="text-xs cursor-pointer">Mark as Unread/New</label>
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={handleSaveItem} className={`w-full py-4 rounded font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-95 ${isWizard ? 'bg-emerald-600 text-black hover:bg-emerald-500' : 'bg-fuchsia-600 text-black hover:bg-fuchsia-500'}`}>
                                            {isEditingItem ? <><RefreshCw size={18} className="inline mr-2" /> UPDATE ARTIFACT</> : <><Plus size={18} className="inline mr-2" /> CREATE ARTIFACT</>}
                                        </button>
                                    </div>

                                    {/* Preview Column - FIXED FOR MOBILE VISIBILITY */}
                                    <div className={`flex flex-col border-t xl:border-t-0 xl:border-l border-white/10 pt-8 xl:pt-0 xl:pl-8 transition-all shrink-0 ${previewMode === 'mobile' ? 'w-full xl:w-[350px]' : 'w-full xl:flex-1'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-xs font-bold uppercase opacity-50">Live Preview</h4>
                                            <div className="flex gap-2 bg-white/5 p-1 rounded">
                                                <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-white text-black' : 'text-white/50'}`}><Smartphone size={14} /></button>
                                                <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-white text-black' : 'text-white/50'}`}><Monitor size={14} /></button>
                                            </div>
                                        </div>

                                        <div className={`rounded-xl border overflow-hidden relative shadow-2xl transition-all duration-300 mx-auto
                                ${isWizard ? 'bg-[#0f1510] border-emerald-500/30' : 'bg-[#150f1a] border-fuchsia-500/30'}
                                ${previewMode === 'mobile' ? 'h-[600px] w-full max-w-[350px]' : 'w-full h-auto min-h-[400px]'}
                            `}>
                                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                                                <span className="text-[10px] uppercase font-bold opacity-70 tracking-widest">{itemForm.sector}</span>
                                                <span className="text-[10px] opacity-50">{itemForm.date}</span>
                                            </div>
                                            {itemForm.image && <img src={itemForm.image} className="w-full h-48 object-cover opacity-80" />}
                                            <div className="p-6 space-y-4 overflow-y-auto max-h-full">
                                                <div className="flex items-start justify-between">
                                                    <h2 className="text-2xl font-bold" style={previewTitleStyle}>{itemForm.title || 'Untitled'}</h2>
                                                    {itemForm.isPinned && <Pin size={16} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                                                </div>
                                                <div
                                                    className="text-sm opacity-80 whitespace-pre-wrap font-sans html-content"
                                                    style={{ color: itemForm.style?.contentColor }}
                                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(itemForm.content, { ADD_TAGS: ['style'] }) }}
                                                ></div>

                                                {/* GALLERY PREVIEW GRID */}
                                                {itemForm.images && itemForm.images.length > 0 && (
                                                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10">
                                                        {itemForm.images.map((img, i) => (
                                                            <div key={i} className="aspect-square rounded-lg overflow-hidden border border-white/10">
                                                                <img src={img} className="w-full h-full object-cover" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SCHEDULER TAB - UPDATED V2.5 */}
                            {activeTab === 'scheduler' && (
                                <div className="space-y-8" id="scheduler-form">
                                    {/* New Rule Form */}
                                    <div className="p-6 rounded-xl border bg-white/5 border-white/10 shadow-lg">
                                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                            <h3 className="font-bold flex items-center gap-2 text-lg">
                                                <CalendarDays size={20} className="text-blue-400" /> 
                                                {editingRuleId ? 'Edit Schedule Rule' : 'Schedule New Class'}
                                            </h3>
                                            {editingRuleId && (
                                                <button onClick={resetRuleForm} className="text-xs px-3 py-1 bg-white/10 rounded hover:bg-white/20">
                                                    Cancel Edit
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                            {/* Batch Selector */}
                                            <div className="md:col-span-2">
                                                <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Batch</label>
                                                <select 
                                                    value={ruleForm.batch || 'AICS'} 
                                                    onChange={e => setRuleForm({ ...ruleForm, batch: e.target.value as 'AICS' | 'CSDA' })} 
                                                    className="w-full p-3 bg-black/40 border border-white/10 rounded-lg outline-none text-sm text-white focus:border-blue-500/50"
                                                >
                                                    <option value="AICS">AICS</option>
                                                    <option value="CSDA">CSDA</option>
                                                </select>
                                            </div>
                                            
                                            {/* Subject Name */}
                                            <div className="md:col-span-10">
                                                <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Subject Name</label>
                                                <input 
                                                    value={ruleForm.subject} 
                                                    onChange={e => setRuleForm({ ...ruleForm, subject: e.target.value })} 
                                                    className="w-full p-3 bg-black/40 border border-white/10 rounded-lg outline-none text-sm text-white focus:border-blue-500/50" 
                                                    placeholder="e.g. Data Structures" 
                                                />
                                            </div>

                                            {/* Multi-Day Selection */}
                                            <div className="md:col-span-12">
                                                <label className="text-xs font-bold opacity-50 block mb-2 uppercase">Repeat On Days</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {allDays.map(day => {
                                                        const isSelected = (ruleForm.days || []).includes(day);
                                                        return (
                                                            <button 
                                                                key={day}
                                                                onClick={() => toggleDay(day)}
                                                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                                                    isSelected 
                                                                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' 
                                                                    : 'bg-black/40 border-white/10 text-zinc-400 hover:bg-white/10'
                                                                }`}
                                                            >
                                                                {day.substring(0, 3)}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Time Range */}
                                            <div className="md:col-span-6 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold opacity-50 block mb-1 uppercase flex items-center gap-1"><Clock size={12}/> Start Time</label>
                                                    <input 
                                                        type="time" 
                                                        value={ruleForm.startTime} 
                                                        onChange={e => setRuleForm({ ...ruleForm, startTime: e.target.value })} 
                                                        className="w-full p-3 bg-black/40 border border-white/10 rounded-lg outline-none text-sm text-white focus:border-blue-500/50" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold opacity-50 block mb-1 uppercase flex items-center gap-1"><Clock size={12}/> End Time</label>
                                                    <input 
                                                        type="time" 
                                                        value={ruleForm.endTime || ''} 
                                                        onChange={e => setRuleForm({ ...ruleForm, endTime: e.target.value })} 
                                                        className="w-full p-3 bg-black/40 border border-white/10 rounded-lg outline-none text-sm text-white focus:border-blue-500/50" 
                                                    />
                                                </div>
                                            </div>

                                            {/* Date Range (Semester) */}
                                            <div className="md:col-span-6 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold opacity-50 block mb-1 uppercase flex items-center gap-1"><Calendar size={12}/> Start Date</label>
                                                    <input 
                                                        type="date" 
                                                        value={ruleForm.startDate || ''} 
                                                        onChange={e => setRuleForm({ ...ruleForm, startDate: e.target.value })} 
                                                        className="w-full p-3 bg-black/40 border border-white/10 rounded-lg outline-none text-sm text-white focus:border-blue-500/50" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold opacity-50 block mb-1 uppercase flex items-center gap-1"><Calendar size={12}/> End Date</label>
                                                    <input 
                                                        type="date" 
                                                        value={ruleForm.endDate || ''} 
                                                        onChange={e => setRuleForm({ ...ruleForm, endDate: e.target.value })} 
                                                        className="w-full p-3 bg-black/40 border border-white/10 rounded-lg outline-none text-sm text-white focus:border-blue-500/50" 
                                                    />
                                                </div>
                                            </div>

                                            {/* Visuals & Link */}
                                            <div className="md:col-span-6">
                                                <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Banner Image URL</label>
                                                <input 
                                                    value={ruleForm.image || ''} 
                                                    onChange={e => setRuleForm({ ...ruleForm, image: e.target.value })} 
                                                    className="w-full p-3 bg-black/40 border border-white/10 rounded-lg outline-none text-sm text-white focus:border-blue-500/50" 
                                                    placeholder="https://..." 
                                                />
                                            </div>

                                            <div className="md:col-span-6">
                                                <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Class Link</label>
                                                <input 
                                                    value={ruleForm.link} 
                                                    onChange={e => setRuleForm({ ...ruleForm, link: e.target.value })} 
                                                    className="w-full p-3 bg-black/40 border border-white/10 rounded-lg outline-none text-sm text-white focus:border-blue-500/50" 
                                                    placeholder="Zoom / Meet Link" 
                                                />
                                            </div>

                                            {/* Description */}
                                            <div className="md:col-span-12">
                                                <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Description / Message</label>
                                                <input 
                                                    value={ruleForm.customMessage || ''} 
                                                    onChange={e => setRuleForm({ ...ruleForm, customMessage: e.target.value })} 
                                                    className="w-full p-3 bg-black/40 border border-white/10 rounded-lg outline-none text-sm text-white focus:border-blue-500/50" 
                                                    placeholder="e.g. 'Please install VS Code before joining'" 
                                                />
                                            </div>

                                            <div className="md:col-span-12 flex justify-end pt-2">
                                                <button 
                                                    onClick={handleSaveRule} 
                                                    className={`px-8 py-3 rounded-lg text-white font-bold text-sm transition-all shadow-lg active:scale-95 ${editingRuleId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'}`}
                                                >
                                                    {editingRuleId ? 'UPDATE SCHEDULE' : 'ADD NEW CLASS'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Schedules List */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                            <h4 className="font-bold text-lg opacity-80">Active Schedule</h4>
                                            <div className="text-xs opacity-50">{schedules.length} classes configured</div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {schedules.map(rule => (
                                                <div key={rule.id} className={`relative p-4 rounded-xl border transition-all group overflow-hidden ${editingRuleId === rule.id ? 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                                                    {rule.image && (
                                                        <div className="absolute inset-0 opacity-10 bg-cover bg-center" style={{backgroundImage: `url(${rule.image})`}}></div>
                                                    )}
                                                    <div className="relative z-10 flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rule.batch === 'CSDA' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                                    {rule.batch || 'AICS'}
                                                                </span>
                                                                <span className="text-xs opacity-50 flex items-center gap-1">
                                                                     <Clock size={10} /> {rule.startTime} {rule.endTime ? `- ${rule.endTime}` : ''}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs opacity-70 mb-2 font-mono text-yellow-500/80">
                                                                {(rule.days && rule.days.length > 0) ? rule.days.join(', ') : rule.dayOfWeek}
                                                            </div>
                                                            <div className="font-bold text-lg">{rule.subject}</div>
                                                            {rule.customMessage && <div className="text-xs opacity-60 mt-1 italic">"{rule.customMessage}"</div>}
                                                            
                                                            {(rule.startDate || rule.endDate) && (
                                                                <div className="text-[10px] opacity-40 mt-2 flex items-center gap-1">
                                                                    <Calendar size={10} /> 
                                                                    {rule.startDate ? rule.startDate.replace(/-/g, '.') : 'Start'} {'->'} {rule.endDate ? rule.endDate.replace(/-/g, '.') : 'End'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleEditRule(rule)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors" title="Edit Rule">
                                                                <PenTool size={16} />
                                                            </button>
                                                            <button onClick={() => handleDeleteRule(rule.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors" title="Delete Rule">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {schedules.length === 0 && (
                                            <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
                                                <div className="opacity-50">No classes scheduled.</div>
                                                <div className="text-[10px] opacity-30 mt-1">Add a rule above to get started.</div>
                                            </div>
                                        )}

                                        <div className="pt-4 flex justify-end border-t border-white/10 sticky bottom-0 bg-black/80 backdrop-blur p-2 rounded-xl z-20">
                                            <button onClick={handleSaveConfig} disabled={isSavingConfig} className="px-8 py-3 bg-blue-600 rounded-lg font-bold text-white hover:bg-blue-500 flex items-center gap-2 shadow-lg hover:shadow-blue-900/20 transition-all active:scale-95">
                                                {isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                                                {schedules.length === 0 ? "SAVE EMPTY SCHEDULE" : "SAVE ALL CHANGES"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* VISITOR SURVEILLANCE TAB */}
                            {activeTab === 'visitors' && (
                                <div className="space-y-6 h-full flex flex-col">
                                    {!selectedVisitor ? (
                                        <div className="bg-white/5 border border-white/10 rounded-xl flex flex-col flex-1 overflow-hidden shadow-2xl animate-[fade-in_0.3s]">
                                            {/* TOP BAR: SEARCH & REFRESH */}
                                            <div className="p-4 bg-black/40 border-b border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center backdrop-blur-md z-10">
                                                <div className="flex items-center gap-3 w-full md:w-auto">
                                                    <ScanFace className="text-blue-400" size={24} />
                                                    <div>
                                                        <h3 className="font-bold text-white">Visitor Surveillance</h3>
                                                        <p className="text-[10px] text-white/50 uppercase tracking-widest">Real-time Tracking</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-2 w-full md:w-auto">
                                                    <div className="relative flex-1 md:w-64">
                                                        <Search className="absolute left-3 top-2.5 text-white/30" size={14} />
                                                        <input 
                                                            placeholder="Search Name or ID..." 
                                                            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-blue-500/50 transition-colors"
                                                            onChange={(e) => {
                                                                const term = e.target.value.toLowerCase();
                                                                const rows = document.querySelectorAll('.visitor-row');
                                                                rows.forEach(row => {
                                                                    const text = row.textContent?.toLowerCase() || '';
                                                                    (row as HTMLElement).style.display = text.includes(term) ? 'table-row' : 'none';
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                    <button onClick={fetchVisitors} className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                                                        <RefreshCw size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* MAIN DATA TABLE */}
                                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                <table className="w-full text-sm text-left border-collapse">
                                                    <thead className="bg-white/5 text-xs uppercase font-bold text-zinc-400 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                                                        <tr>
                                                            <th className="p-4 border-b border-white/10">Identity</th>
                                                            <th className="p-4 border-b border-white/10">Engagement</th>
                                                            <th className="p-4 border-b border-white/10">Last Signal</th>
                                                            <th className="p-4 border-b border-white/10 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {visitors.map((v) => (
                                                            <tr key={v.visitor_id} className="visitor-row border-b border-white/5 hover:bg-white/5 group transition-colors">
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border shadow-lg ${
                                                                            v.display_name === 'Guest' 
                                                                            ? 'bg-zinc-800 border-zinc-600 text-zinc-400' 
                                                                            : 'bg-blue-900/30 border-blue-500 text-blue-400'
                                                                        }`}>
                                                                            {v.display_name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-white flex items-center gap-2">
                                                                                {v.display_name}
                                                                                {v.visit_count > 10 && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded border border-yellow-500/30">REGULAR</span>}
                                                                            </div>
                                                                            <div className="font-mono text-[10px] opacity-40">{v.visitor_id.substring(0, 12)}...</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center gap-2 text-xs">
                                                                            <Activity size={12} className="text-green-400" />
                                                                            <span className="opacity-80 font-mono">{v.visit_count} Sessions</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-xs">
                                                                            <Monitor size={12} className="text-purple-400" />
                                                                            <span className="opacity-80 font-mono">{(v.total_time_spent / 60).toFixed(1)}m Active</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="text-xs">
                                                                        <div className="opacity-80">{new Date(v.last_active).toLocaleDateString()}</div>
                                                                        <div className="opacity-40 font-mono">{new Date(v.last_active).toLocaleTimeString()}</div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button 
                                                                            onClick={() => handleVisitorSelect(v)}
                                                                            className="px-3 py-1.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
                                                                        >
                                                                            DOSSIER
                                                                        </button>
                                                                        <button 
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                if(!confirm(`PERMANENTLY DELETE records for ${v.display_name}?`)) return;
                                                                                
                                                                                try {
                                                                                    const res = await fetch(`${API_URL}/api/admin/visitors/${v.visitor_id}`, {
                                                                                        method: 'DELETE',
                                                                                        headers: { 'x-csrf-token': csrfToken },
                                                                                        credentials: 'include'
                                                                                    });
                                                                                    if(res.ok) {
                                                                                        fetchVisitors();
                                                                                    } else {
                                                                                        alert("Delete failed");
                                                                                    }
                                                                                } catch(err) { alert("Error deleting"); }
                                                                            }}
                                                                            className="p-1.5 rounded bg-red-900/20 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white transition-all"
                                                                            title="Delete Visitor Log"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {visitors.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center h-64 opacity-30">
                                                        <ScanFace size={64} />
                                                        <p className="mt-4 text-sm font-mono">NO SIGNALS DETECTED</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        // DETAIL VIEW (DOSSIER)
                                        <div className="flex flex-col h-full animate-[fade-in-up_0.2s]">
                                            <div className="flex items-center gap-4 mb-4">
                                                <button onClick={() => setSelectedVisitor(null)} className="p-2 rounded bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-2">
                                                    <ArrowDownUp className="rotate-90" size={14} /> BACK
                                                </button>
                                                <h3 className="text-xl font-bold">{selectedVisitor.display_name}'s Dossier</h3>
                                                <span className="px-2 py-1 rounded bg-blue-900/50 text-blue-200 text-xs font-mono">{selectedVisitor.visitor_id}</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                                                {/* ACTIVITY LOG - UPDATED TO HIDE HEARTBEATS */}
                                                <div className="bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden">
                                                    <div className="p-3 bg-black/20 border-b border-white/10 font-bold flex items-center gap-2 text-sm text-blue-300">
                                                        <Activity size={16} /> Activity History
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                                        {loadingDetails ? <div className="text-center p-4"><Loader2 className="animate-spin mx-auto" /></div> :
                                                            visitorDetails?.activity ? (
                                                                (() => {
                                                                    // --- FILTER LOGIC APPLIED HERE ---
                                                                    const visibleActivity = visitorDetails.activity.filter(a => a.activity_type !== 'HEARTBEAT');
                                                                    
                                                                    if (visibleActivity.length > 0) {
                                                                        return visibleActivity.map((act, i) => (
                                                                            <div key={i} className="flex gap-3 text-xs border-b border-white/5 pb-2">
                                                                                <div className="opacity-50 font-mono whitespace-nowrap w-16 text-right">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                                                <div>
                                                                                    <div className="font-bold text-white mb-0.5">{act.activity_type.replace('_', ' ')}</div>
                                                                                    <div className="opacity-70">{act.resource_title || act.resource_id}</div>
                                                                                    {act.duration_seconds > 0 && <div className="text-[10px] text-green-400 mt-1">{act.duration_seconds}s duration</div>}
                                                                                </div>
                                                                            </div>
                                                                        ));
                                                                    } else {
                                                                        return <div className="opacity-50 text-center text-xs">No significant activity recorded (Heartbeats hidden).</div>;
                                                                    }
                                                                })()
                                                            ) : <div className="opacity-50 text-center text-xs">No data found.</div>
                                                        }
                                                    </div>
                                                </div>

                                                {/* CHAT LOG */}
                                                <div className="bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden">
                                                    <div className="p-3 bg-black/20 border-b border-white/10 font-bold flex items-center gap-2 text-sm text-purple-300">
                                                        <MessageSquare size={16} /> Oracle Interactions
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                                        {loadingDetails ? <div className="text-center p-4"><Loader2 className="animate-spin mx-auto" /></div> :
                                                            visitorDetails?.chats && visitorDetails.chats.length > 0 ? (
                                                                visitorDetails.chats.map((chat, i) => (
                                                                    <div key={i} className="flex flex-col gap-2 text-xs border-b border-white/5 pb-3">
                                                                        <div className="font-mono opacity-30 text-[10px]">{new Date(chat.timestamp).toLocaleString()}</div>
                                                                        <div className="bg-white/5 p-2 rounded text-white italic">"{chat.user_query}"</div>
                                                                        <div className="pl-2 border-l-2 border-purple-500/50 text-purple-100 opacity-80 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                                                                            {chat.bot_response.replace(/<[^>]+>/g, '')}
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : <div className="opacity-50 text-center text-xs">No conversations found.</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LOGS TAB */}
                            {activeTab === 'logs' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-xl">System Audit Logs</h3>
                                        <button onClick={fetchAuditLogs} className="p-2 bg-white/10 rounded hover:bg-white/20"><RefreshCw size={16} /></button>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-black/40 text-xs uppercase font-bold text-zinc-400">
                                                <tr>
                                                    <th className="p-3">Time</th>
                                                    <th className="p-3">User</th>
                                                    <th className="p-3">Action</th>
                                                    <th className="p-3">Details</th>
                                                    <th className="p-3">IP</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditLogs.map((log, i) => (
                                                    <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                                                        <td className="p-3 font-mono text-xs opacity-70 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                                        <td className="p-3 font-bold text-white">{log.username}</td>
                                                        <td className="p-3"><span className="px-2 py-1 rounded bg-white/10 font-mono text-[10px]">{log.action}</span></td>
                                                        <td className="p-3 opacity-80">{log.details}</td>
                                                        <td className="p-3 font-mono text-xs opacity-50">{log.ip}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {auditLogs.length === 0 && <div className="p-8 text-center opacity-50">No logs recorded.</div>}
                                    </div>
                                </div>
                            )}

                            {/* AI LAB TAB */}
                            {activeTab === 'ai-lab' && (
                                <div className="flex flex-col h-full max-w-4xl mx-auto space-y-6">
                                    <div className="p-6 rounded-xl border bg-white/5 border-white/10">
                                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><BrainCircuit size={20} /> AI Parser & Content Generator</h3>
                                        <p className="text-sm opacity-60 mb-4">Upload a file or paste text to extract structured data for the database.</p>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex gap-4">
                                                <input type="file" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="flex-1 bg-black/40 border border-white/10 rounded p-2 text-sm" />
                                                <button onClick={() => setSelectedFile(null)} className="p-2 border border-white/10 rounded hover:bg-white/10"><X size={16} /></button>
                                            </div>
                                            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Optional Instructions (e.g. 'Extract title and summary')" className="w-full h-24 bg-black/40 border border-white/10 rounded p-3 text-sm outline-none resize-none" />
                                            <button onClick={handleAiParse} disabled={aiLoading} className={`w-full py-3 rounded font-bold transition-all ${isWizard ? 'bg-purple-900 text-purple-100 hover:bg-purple-800' : 'bg-blue-900 text-blue-100 hover:bg-blue-800'}`}>
                                                {aiLoading ? <Loader2 className="animate-spin mx-auto" /> : 'ANALYZE CONTENT'}
                                            </button>
                                        </div>
                                    </div>

                                    {aiResult && (
                                        <div className="flex-1 overflow-y-auto p-4 rounded-xl border bg-white/5 border-white/10">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold">Analysis Result</h4>
                                                <button onClick={transferAiToForm} className="px-4 py-1.5 bg-green-600 rounded text-black font-bold text-xs hover:bg-green-500">USE THIS DATA</button>
                                            </div>
                                            <pre className="text-xs font-mono whitespace-pre-wrap opacity-70 bg-black/40 p-4 rounded">{JSON.stringify(aiResult, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* USERS TAB */}
                            {activeTab === 'users' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="font-bold mb-4">Manage Admins</h3>
                                        <div className="space-y-2">
                                            {users.map(u => (
                                                <div key={u.username} className="p-4 rounded border border-white/10 bg-white/5 flex justify-between items-center">
                                                    <div>
                                                        <div className="font-bold text-lg">{u.username}</div>
                                                        <div className="text-xs opacity-50 flex gap-2 mt-1">
                                                            {u.permissions?.isGod && <span className="text-red-400">GOD</span>}
                                                            {u.permissions?.canEdit && <span>EDITOR</span>}
                                                            {u.permissions?.canDelete && <span>DELETER</span>}
                                                        </div>
                                                    </div>
                                                    {u.username !== 'admin' && u.username !== currentUser && (
                                                        <button onClick={() => handleDeleteUser(u.username)} className="p-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded"><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="p-6 rounded border border-white/10 bg-white/5 space-y-4">
                                            <h3 className="font-bold">Create New Admin</h3>
                                            <input value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="Username" className="w-full p-2 bg-black/40 border border-white/10 rounded text-white" />
                                            <input type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} placeholder="Password" className="w-full p-2 bg-black/40 border border-white/10 rounded text-white" />

                                            <div className="space-y-2">
                                                <div className="text-xs font-bold opacity-50 uppercase">Permissions</div>
                                                <label className="flex items-center gap-2"><input type="checkbox" checked={newPermissions.canEdit} onChange={e => setNewPermissions({ ...newPermissions, canEdit: e.target.checked })} /> Can Edit</label>
                                                <label className="flex items-center gap-2"><input type="checkbox" checked={newPermissions.canDelete} onChange={e => setNewPermissions({ ...newPermissions, canDelete: e.target.checked })} /> Can Delete</label>
                                                <label className="flex items-center gap-2"><input type="checkbox" checked={newPermissions.canViewLogs} onChange={e => setNewPermissions({ ...newPermissions, canViewLogs: e.target.checked })} /> View Logs</label>
                                                <label className="flex items-center gap-2"><input type="checkbox" checked={newPermissions.canManageUsers} onChange={e => setNewPermissions({ ...newPermissions, canManageUsers: e.target.checked })} /> Manage Users</label>
                                            </div>

                                            <button onClick={handleCreateUser} className="w-full py-2 bg-green-600 rounded font-bold hover:bg-green-500">CREATE USER</button>
                                        </div>

                                        <div className="p-6 rounded border border-white/10 bg-white/5 space-y-4">
                                            <h3 className="font-bold">Change My Password</h3>
                                            <input type="password" value={changePassData.current} onChange={e => setChangePassData({ ...changePassData, current: e.target.value })} placeholder="Current Password" className="w-full p-2 bg-black/40 border border-white/10 rounded text-white" />
                                            <input type="password" value={changePassData.new} onChange={e => setChangePassData({ ...changePassData, new: e.target.value })} placeholder="New Password" className="w-full p-2 bg-black/40 border border-white/10 rounded text-white" />
                                            <input type="password" value={changePassData.confirm} onChange={e => setChangePassData({ ...changePassData, confirm: e.target.value })} placeholder="Confirm New Password" className="w-full p-2 bg-black/40 border border-white/10 rounded text-white" />
                                            <button onClick={handleChangePassword} disabled={isLoading} className="w-full py-2 bg-blue-600 rounded font-bold hover:bg-blue-500">UPDATE PASSWORD</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BACKUP TAB */}
                            {activeTab === 'backup' && (
                                <div className="space-y-8 max-w-xl mx-auto text-center py-10">
                                    <div className="p-8 border border-white/10 rounded-xl bg-white/5 space-y-4">
                                        <HardDrive size={48} className="mx-auto text-blue-400 mb-4" />
                                        <h3 className="text-2xl font-bold">System Backup</h3>
                                        <p className="opacity-70 text-sm">Download a full JSON snapshot of the database, config, and logs.</p>
                                        <button onClick={handleExportData} className="px-8 py-3 bg-blue-600 rounded-full font-bold hover:bg-blue-500 inline-flex items-center gap-2">
                                            {isLoading ? <Loader2 className="animate-spin" /> : <FileUp size={18} />} EXPORT DATA
                                        </button>
                                    </div>

                                    <div className="p-8 border border-white/10 rounded-xl bg-white/5 space-y-4 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                                        <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
                                        <h3 className="text-2xl font-bold text-red-400">System Restore</h3>
                                        <p className="opacity-70 text-sm">Upload a backup JSON to overwrite the current database. <br /><span className="font-bold text-red-300">WARNING: This cannot be undone.</span></p>

                                        <input type="file" ref={importFileRef} onChange={handleImportData} accept=".json" className="hidden" />
                                        <button onClick={() => importFileRef.current?.click()} className="px-8 py-3 bg-red-900/50 border border-red-500 rounded-full font-bold hover:bg-red-900 text-red-200 inline-flex items-center gap-2">
                                            {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />} RESTORE FROM BACKUP
                                        </button>
                                        {importStatus && (
                                            <div className="mt-4 text-xs font-mono p-2 bg-black/50 rounded border border-white/10">
                                                STATUS: {importStatus}
                                                <div className="w-full h-1 bg-white/10 mt-1 rounded-full overflow-hidden">
                                                    <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CONFIG TAB - UPDATED WITH UPDATE POPUP */}
                            {activeTab === 'config' && (
                                <div className="space-y-6 max-w-3xl">
                                    <div className="p-6 rounded border bg-white/5 border-white/10 space-y-6">
                                        
                                        {/* NEW: UPDATE POPUP MANAGER */}
                                        <div className="bg-purple-900/10 border border-purple-500/30 rounded-xl p-4 space-y-4">
                                            <div className="flex items-center gap-2 border-b border-purple-500/30 pb-2 mb-2">
                                                <Sparkles className="text-purple-400" size={20} />
                                                <h3 className="font-bold text-purple-100">System Update Announcement</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs opacity-50 mb-1 block">Version Tag (Triggers Popup on Change)</label>
                                                    <input 
                                                        value={editedConfig.updatePopup?.version || ''} 
                                                        onChange={e => setEditedConfig({ ...editedConfig, updatePopup: { ...(editedConfig.updatePopup || { title: '', content: '', isActive: false }), version: e.target.value } })} 
                                                        className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" 
                                                        placeholder="e.g. 2.5"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 pt-6">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={editedConfig.updatePopup?.isActive || false} 
                                                        onChange={e => setEditedConfig({ ...editedConfig, updatePopup: { ...(editedConfig.updatePopup || { title: '', content: '', version: '' }), isActive: e.target.checked } })}
                                                        id="popup-active"
                                                    />
                                                    <label htmlFor="popup-active" className="text-sm cursor-pointer">Popup Enabled</label>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs opacity-50 mb-1 block">Title</label>
                                                <input 
                                                    value={editedConfig.updatePopup?.title || ''} 
                                                    onChange={e => setEditedConfig({ ...editedConfig, updatePopup: { ...(editedConfig.updatePopup || { version: '', content: '', isActive: false }), title: e.target.value } })} 
                                                    className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" 
                                                    placeholder="e.g. SYSTEM UPGRADE"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs opacity-50 mb-1 block">Message Content (HTML Supported)</label>
                                                <textarea 
                                                    value={editedConfig.updatePopup?.content || ''} 
                                                    onChange={e => setEditedConfig({ ...editedConfig, updatePopup: { ...(editedConfig.updatePopup || { version: '', title: '', isActive: false }), content: e.target.value } })} 
                                                    className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm h-24" 
                                                    placeholder="HTML content describing the new features..."
                                                />
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-lg border-b border-white/10 pb-2">Identity & Branding</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs opacity-50 mb-1 block">Wizard Title</label>
                                                <input value={editedConfig.wizardTitle} onChange={e => setEditedConfig({ ...editedConfig, wizardTitle: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-xs opacity-50 mb-1 block">Muggle Title</label>
                                                <input value={editedConfig.muggleTitle} onChange={e => setEditedConfig({ ...editedConfig, muggleTitle: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-xs opacity-50 mb-1 block">Wizard Logo Text</label>
                                                <input value={editedConfig.wizardLogoText} onChange={e => setEditedConfig({ ...editedConfig, wizardLogoText: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-xs opacity-50 mb-1 block">Muggle Logo Text</label>
                                                <input value={editedConfig.muggleLogoText} onChange={e => setEditedConfig({ ...editedConfig, muggleLogoText: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold uppercase opacity-50">Logos & Images</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex gap-2 items-end">
                                                    <div className="flex-1">
                                                        <label className="text-xs opacity-50 mb-1 block">Wizard Logo URL</label>
                                                        <input value={editedConfig.wizardLogoUrl || ''} onChange={e => setEditedConfig({ ...editedConfig, wizardLogoUrl: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" />
                                                    </div>
                                                    <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"><ImageIcon size={16} /><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'wizardLogoUrl')} /></label>
                                                </div>
                                                <div className="flex gap-2 items-end">
                                                    <div className="flex-1">
                                                        <label className="text-xs opacity-50 mb-1 block">Muggle Logo URL</label>
                                                        <input value={editedConfig.muggleLogoUrl || ''} onChange={e => setEditedConfig({ ...editedConfig, muggleLogoUrl: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" />
                                                    </div>
                                                    <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"><ImageIcon size={16} /><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'muggleLogoUrl')} /></label>
                                                </div>
                                                <div className="flex gap-2 items-end">
                                                    <div className="flex-1">
                                                        <label className="text-xs opacity-50 mb-1 block">Wizard Background URL</label>
                                                        <input value={editedConfig.wizardImage || ''} onChange={e => setEditedConfig({ ...editedConfig, wizardImage: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" />
                                                    </div>
                                                    <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"><ImageIcon size={16} /><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'wizardImage')} /></label>
                                                </div>
                                                <div className="flex gap-2 items-end">
                                                    <div className="flex-1">
                                                        <label className="text-xs opacity-50 mb-1 block">Muggle Background URL</label>
                                                        <input value={editedConfig.muggleImage || ''} onChange={e => setEditedConfig({ ...editedConfig, muggleImage: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" />
                                                    </div>
                                                    <label className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"><ImageIcon size={16} /><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'muggleImage')} /></label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-white/10">
                                            <h4 className="text-xs font-bold uppercase opacity-50 flex items-center gap-2"><BellRing size={14} /> Audio Alarms</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs opacity-50 mb-1 block">Wizard Alarm URL</label>
                                                    <input value={editedConfig.wizardAlarmUrl || ''} onChange={e => setEditedConfig({ ...editedConfig, wizardAlarmUrl: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" placeholder="https://.../harp.mp3" />
                                                </div>
                                                <div>
                                                    <label className="text-xs opacity-50 mb-1 block">Muggle Alarm URL</label>
                                                    <input value={editedConfig.muggleAlarmUrl || ''} onChange={e => setEditedConfig({ ...editedConfig, muggleAlarmUrl: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" placeholder="https://.../beep.mp3" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-white/10">
                                            <h3 className="font-bold text-lg border-b border-white/10 pb-2">Gate & System</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs opacity-50 mb-1 block">Wizard Gate Text</label>
                                                    <textarea value={editedConfig.wizardGateText} onChange={e => setEditedConfig({ ...editedConfig, wizardGateText: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm h-20" />
                                                </div>
                                                <div>
                                                    <label className="text-xs opacity-50 mb-1 block">Muggle Gate Text</label>
                                                    <textarea value={editedConfig.muggleGateText} onChange={e => setEditedConfig({ ...editedConfig, muggleGateText: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm h-20" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs opacity-50 mb-1 block">Telegram Channel Link</label>
                                                <input value={editedConfig.telegramLink || ''} onChange={e => setEditedConfig({ ...editedConfig, telegramLink: e.target.value })} className="w-full p-2 bg-black/40 border border-white/10 rounded text-white text-sm" placeholder="https://t.me/..." />
                                            </div>
                                        </div>

                                        <button onClick={handleSaveConfig} disabled={isSavingConfig} className="w-full py-3 bg-blue-600 rounded font-bold hover:bg-blue-500 flex justify-center items-center gap-2">
                                            {isSavingConfig ? <Loader2 className="animate-spin" /> : <Save size={18} />} SAVE CONFIGURATION
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STRUCTURE TAB (Unchanged) */}
                            {activeTab === 'structure' && (
                                <div className="space-y-6 pb-20">
                                    <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md p-4 -mx-4 -mt-4 border-b border-white/10 flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-bold text-xl text-white">Sector Configuration</h3>
                                            <p className="text-xs opacity-50">Manage section names, icons, and sorting rules.</p>
                                        </div>
                                        <button onClick={handleSaveSectors} disabled={isSavingSectors} className="px-6 py-2 rounded-full font-bold bg-blue-600 text-white flex items-center gap-2">
                                            {isSavingSectors ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} SAVE ALL
                                        </button>
                                    </div>
                                    <div className="grid gap-6">
                                        {editedSectors.map((sector, idx) => (
                                            <div key={sector.id} className="p-6 rounded-xl border bg-white/5 border-white/10 shadow-lg relative group">
                                                <div className="absolute top-4 right-4 text-xs font-mono opacity-30">{sector.id.toUpperCase()}</div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <h4 className="text-xs font-bold uppercase opacity-50 text-emerald-400">Wizard Mode</h4>
                                                        <div>
                                                            <label className="text-[10px] uppercase opacity-50 block mb-1">Display Name</label>
                                                            <input value={sector.wizardName} onChange={e => handleUpdateSector(idx, 'wizardName', e.target.value)} className="w-full p-2 bg-black border border-white/10 rounded text-white text-sm" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] uppercase opacity-50 block mb-1">Icon Name (Lucide)</label>
                                                            <input value={sector.wizardIcon} onChange={e => handleUpdateSector(idx, 'wizardIcon', e.target.value)} className="w-full p-2 bg-black border border-white/10 rounded text-white text-sm" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="text-xs font-bold uppercase opacity-50 text-fuchsia-400">Muggle Mode</h4>
                                                        <div>
                                                            <label className="text-[10px] uppercase opacity-50 block mb-1">Display Name</label>
                                                            <input value={sector.muggleName} onChange={e => handleUpdateSector(idx, 'muggleName', e.target.value)} className="w-full p-2 bg-black border border-white/10 rounded text-white text-sm" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] uppercase opacity-50 block mb-1">Icon Name (Lucide)</label>
                                                            <input value={sector.muggleIcon} onChange={e => handleUpdateSector(idx, 'muggleIcon', e.target.value)} className="w-full p-2 bg-black border border-white/10 rounded text-white text-sm" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="md:col-span-2">
                                                        <label className="text-[10px] uppercase opacity-50 block mb-1">Description</label>
                                                        <input value={sector.description} onChange={e => handleUpdateSector(idx, 'description', e.target.value)} className="w-full p-2 bg-black border border-white/10 rounded text-white text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase opacity-50 block mb-1">Sorting Rule</label>
                                                        <select
                                                            value={sector.sortOrder || 'newest'}
                                                            onChange={e => handleUpdateSector(idx, 'sortOrder', e.target.value)}
                                                            className="w-full p-2 bg-black border border-white/10 rounded text-white text-sm"
                                                        >
                                                            <option value="newest">Newest First</option>
                                                            <option value="oldest">Oldest First</option>
                                                            <option value="alphabetical">Alphabetical (A-Z)</option>
                                                            <option value="manual">Manual Drag & Drop</option>
                                                        </select>
                                                    </div>
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

export default AdminPanel;