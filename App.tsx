import React, { useState, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import IdentityGate from './components/IdentityGate';
import Sidebar from './components/Sidebar';
import Carousel from './components/Carousel';
import HUD from './components/HUD';
import LiveBackground from './components/LiveBackground';
import { Lineage, SECTORS, type CarouselItem, type UserProfile, type Sector, type AdminPermissions, type LectureRule, GlobalConfig, FONT_LIBRARY } from './types';
import { Menu, Briefcase, Lock, LayoutList, Loader2, Info, ShieldAlert, Activity } from 'lucide-react';
import { supabase } from './lib/supabase';

const SectorView = lazy(() => import('./components/SectorViews'));
const ToolsModal = lazy(() => import('./components/ToolsModal'));
const ItemViewer = lazy(() => import('./components/ItemViewer'));
const PDFViewer = lazy(() => import('./components/PDFViewer'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const CommandCenter = lazy(() => import('./components/CommandCenter'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const OracleInterface = lazy(() => import('./components/OracleInterface'));
const SystemInfoView = lazy(() => import('./components/SystemInfoView'));

const getEnvVar = (key: string) => {
  try { return (import.meta as any).env?.[key]; } catch { return undefined; }
};
// If VITE_API_URL is defined (production), use it. Otherwise empty string triggers local proxy to /api
export const API_URL = (getEnvVar('VITE_API_URL') || '').replace(/\/$/, '');

async function safeFetch(url: string, options: RequestInit = {}) {
    try {
        // Prevent caching for all API requests to ensure fresh config
        const defaultOptions: RequestInit = { 
            ...options, 
            credentials: 'include',
            headers: { ...options.headers, 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        };
        const res = await fetch(url, defaultOptions);
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            return { ok: res.ok, data: json, status: res.status };
        } catch (e) {
            return { ok: false, data: { error: "Server returned invalid response" }, status: res.status };
        }
    } catch (e) {
        return { ok: false, data: { error: "Network Error" }, status: 0 };
    }
}

const DEFAULT_CONFIG: GlobalConfig = {
  wizardTitle: 'Avada Kedavra',
  muggleTitle: 'Muggle',
  wizardLogoText: 'C',
  muggleLogoText: 'CC',
  wizardGateText: 'Click only if you have been selected in Hogwarts!',
  muggleGateText: 'Click if you dont know magic !',
  wizardAlarmUrl: 'https://actions.google.com/sounds/v1/cartoon/harp_strum.ogg',
  muggleAlarmUrl: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
  wizardImage: 'https://images.unsplash.com/photo-1598153346810-860daa0d6cad?q=80&w=2070&auto=format&fit=crop',
  muggleImage: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop',
  telegramLink: '',
  schedules: [],
  cursorStyle: 'classic'
};

const LoadingSpinner = ({ lineage, color }: { lineage: Lineage | null, color?: string }) => (
    <div className={`fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black transition-colors duration-1000`} style={{color: color || (lineage === Lineage.WIZARD ? '#10b981' : '#d946ef')}}>
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="text-xs uppercase tracking-[0.2em] opacity-50 animate-pulse">Initializing Core...</p>
    </div>
);

const App: React.FC = () => {
  const [lineage, setLineage] = useState<Lineage | null>(null);
  const [activeSectorId, setActiveSectorId] = useState<string>('announcements');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbItems, setDbItems] = useState<CarouselItem[]>([]);
  const [sectors, setSectors] = useState<Sector[]>(SECTORS);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false); 
  const [isOffline, setIsOffline] = useState(false);
  const [announcementViewMode, setAnnouncementViewMode] = useState<'carousel' | 'list'>('carousel');
  const [isAdmin, setIsAdmin] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<string>('');
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  
  const [adminInitialTab, setAdminInitialTab] = useState<'database' | 'creator' | 'scheduler' | 'config' | 'users' | 'visitors' | 'backup' | 'ai-lab' | 'structure'>('database');
  
  const [profile, setProfile] = useState<UserProfile>(() => {
      try {
          const saved = localStorage.getItem('core_connect_profile');
          if (saved) return JSON.parse(saved);
      } catch (e) {}
      return { 
          id: crypto.randomUUID(), 
          displayName: '', 
          house: 'Griffindor', 
          totalTimeSpent: 0, 
          visitCount: 1, 
          lastActive: new Date().toISOString(),
          brightness: 100,
          contrast: 100,
          themeColor: '#f43f5e' 
      };
  });

  const [toolsOpen, setToolsOpen] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [oracleOpen, setOracleOpen] = useState(false); 
  const [viewingItem, setViewingItem] = useState<CarouselItem | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);

  // Time Tracking
  useEffect(() => {
      const interval = setInterval(() => {
          setProfile(prev => ({ ...prev, totalTimeSpent: prev.totalTimeSpent + 1, lastActive: new Date().toISOString() }));
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  // Heartbeat & Persistence (Regular Interval)
  useEffect(() => {
      localStorage.setItem('core_connect_profile', JSON.stringify(profile));
      if (profile.totalTimeSpent > 0 && profile.totalTimeSpent % 30 === 0) {
          triggerHeartbeat();
      }
  }, [profile]);

  const triggerHeartbeat = async () => {
      await safeFetch(`${API_URL}/api/visitor/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              visitorId: profile.id, 
              displayName: profile.displayName, 
              timeSpent: profile.totalTimeSpent, 
              visitCount: profile.visitCount 
          })
      });
  };

  // LAZY SHORTCUTS
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

        if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            setAdminInitialTab('database');
            setAdminPanelOpen(prev => !prev);
        }
        if (e.shiftKey && (e.key === 'C' || e.key === 'c')) {
            e.preventDefault();
            setAdminInitialTab('creator');
            setEditingItem(null); 
            setAdminPanelOpen(true);
        }
        if (e.shiftKey && e.key === '?') {
            e.preventDefault();
            setCmdOpen(prev => !prev);
        }
        if (e.key === 'Escape') {
            setAdminPanelOpen(false);
            setToolsOpen(false);
            setCmdOpen(false);
            setOracleOpen(false);
            setCommandCenterOpen(false);
            setViewingItem(null);
        }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Apply Fonts Globally (Style Injection)
  useEffect(() => {
      if (profile.preferredFont) {
          // 1. Find or construct the font family string
          let fontFamily = '';
          const knownFont = FONT_LIBRARY.find(f => f.id === profile.preferredFont);
          
          if (knownFont) {
              fontFamily = knownFont.family;
              // Ensure Google Font Link is present
              const linkId = `font-loader-${knownFont.name.replace(/\s+/g, '-')}`;
              if (!document.getElementById(linkId)) {
                  const link = document.createElement('link');
                  link.id = linkId;
                  link.href = `https://fonts.googleapis.com/css2?family=${knownFont.name.replace(/ /g, '+')}&display=swap`;
                  link.rel = 'stylesheet';
                  document.head.appendChild(link);
              }
          } else {
              // Custom/Fallback
              fontFamily = `"${profile.preferredFont}", sans-serif`;
              // Try to load it blindly if it's not in library (fallback logic)
              const linkId = `font-loader-${profile.preferredFont.replace(/\s+/g, '-')}`;
              if (!document.getElementById(linkId)) {
                  const link = document.createElement('link');
                  link.id = linkId;
                  link.href = `https://fonts.googleapis.com/css2?family=${profile.preferredFont.replace(/ /g, '+')}&display=swap`;
                  link.rel = 'stylesheet';
                  document.head.appendChild(link);
              }
          }

          // 2. Inject CSS to override Tailwind classes globally
          // We target body and specific utility classes to force the user preference
          const styleId = 'global-font-override';
          let styleEl = document.getElementById(styleId) as HTMLStyleElement;
          if (!styleEl) {
              styleEl = document.createElement('style');
              styleEl.id = styleId;
              document.head.appendChild(styleEl);
          }

          styleEl.innerHTML = `
            :root {
                --user-font: ${fontFamily};
            }
            body, button, input, select, textarea, 
            .font-wizard, .font-muggle, .font-sans, .font-serif, .font-mono,
            .font-wizardTitle {
                font-family: var(--user-font) !important;
            }
            /* EXCEPTION: Protect the message content in ItemViewer */
            .safe-font, .safe-font * {
                font-family: "Inter", "Segoe UI", system-ui, sans-serif !important;
            }
          `;
      }
  }, [profile.preferredFont]);

  // Load Config
  useEffect(() => {
    const savedSectors = localStorage.getItem('core_connect_sectors');
    if (savedSectors) setSectors(JSON.parse(savedSectors));
    
    const savedConfig = localStorage.getItem('core_connect_global_config_v2');
    if (savedConfig) setGlobalConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });

    const fetchConfig = async () => {
      // Force fresh fetch by appending timestamp query to bypass cache
      const { ok, data } = await safeFetch(`${API_URL}/api/config?t=${Date.now()}`);
      if (ok && data) {
          setGlobalConfig(prev => {
             const newData = {...prev, ...data};
             localStorage.setItem('core_connect_global_config_v2', JSON.stringify(newData));
             return newData;
          });
          setIsOffline(false);
      } else {
         console.warn("Using offline/cached config.");
         setIsOffline(true);
      }
      setConfigLoaded(true);
    };
    
    const fetchSectors = async () => {
        const { ok, data } = await safeFetch(`${API_URL}/api/sectors?t=${Date.now()}`);
        if (ok && data && Array.isArray(data) && data.length > 0) {
            setSectors(data);
            localStorage.setItem('core_connect_sectors', JSON.stringify(data));
        }
    };

    fetchConfig();
    fetchSectors();
  }, []);

  const saveSectors = async (newSectors: Sector[]) => {
    setSectors(newSectors);
    localStorage.setItem('core_connect_sectors', JSON.stringify(newSectors));
    if (isAdmin && csrfToken) {
        await safeFetch(`${API_URL}/api/admin/sectors`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
            body: JSON.stringify(newSectors)
        });
    }
  };

  const saveGlobalConfig = async (newConfig: GlobalConfig): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      // 1. Update UI Immediately (Optimistic)
      setGlobalConfig(newConfig);
      localStorage.setItem('core_connect_global_config_v2', JSON.stringify(newConfig));
      
      // 2. Sync to Server
      if (isAdmin && csrfToken) {
        const { ok, data } = await safeFetch(`${API_URL}/api/admin/config`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
            body: JSON.stringify(newConfig)
        });
        
        if (!ok) {
            alert(`CRITICAL: Config Saved LOCALLY but failed to sync to SERVER.\nError: ${data?.error || 'Unknown'}`);
            reject(new Error(data?.error));
        } else {
            resolve();
        }
      } else {
          // If not logged in, just resolve (local update only)
          resolve();
      }
    });
  };

  // Auth Check on Mount
  useEffect(() => {
    const checkAuth = async () => {
      const { ok, data } = await safeFetch(`${API_URL}/api/me`);
      if (ok && data?.authenticated) {
          setIsAdmin(true); 
          setCsrfToken(data.csrfToken); 
          setPermissions(data.permissions); 
          setCurrentUser(data.username);
      }
    };
    checkAuth();
    fetchDbItems();
  }, []);

  const fetchDbItems = async () => {
      const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (data && !error) {
          setDbItems(data.map((d: any) => ({
              id: d.id, title: d.title, content: d.content, date: d.date, type: d.type,
              subject: d.subject, image: d.image, fileUrl: d.file_url, author: d.author,
              likes: d.likes || 0, isUnread: d.is_unread, sector: d.sector, style: d.style
          })));
      }
  };

  // Swipe Logic
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null); 

  const handleTouchStart = (e: React.TouchEvent) => { 
      touchStartX.current = e.touches[0].clientX; 
      touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartX.current || !touchStartY.current) return;
      const target = e.target as HTMLElement;
      if (target.closest('.no-swipe') || target.closest('.overflow-x-auto') || target.closest('.overflow-y-auto') || target.closest('input') || target.closest('textarea')) return;
      
      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      const diffY = touchStartY.current - e.changedTouches[0].clientY;

      if (Math.abs(diffY) > Math.abs(diffX)) {
           touchStartX.current = null;
           touchStartY.current = null;
           return;
      }

      if (Math.abs(diffX) > 60) { 
          const currentIdx = sectors.findIndex(s => s.id === activeSectorId);
          if (diffX > 0) setActiveSectorId(sectors[(currentIdx + 1) % sectors.length].id);
          else setActiveSectorId(sectors[(currentIdx - 1 + sectors.length) % sectors.length].id);
      }
      touchStartX.current = null;
      touchStartY.current = null;
  };

  const allGameData = useMemo(() => dbItems.sort((a, b) => new Date(b.date.replace(/\./g, '-')).getTime() - new Date(a.date.replace(/\./g, '-')).getTime()), [dbItems]);
  const currentViewItems = useMemo(() => allGameData.filter(i => i.sector === activeSectorId), [allGameData, activeSectorId]);

  const handleLineageSelect = (l: Lineage, name?: string) => {
      setLineage(l);
      setProfile(prev => ({ 
          ...prev, 
          displayName: name || prev.displayName, 
          visitCount: prev.visitCount + 1 
      }));
      setTimeout(triggerHeartbeat, 100); 
      if (profile.defaultSector) setActiveSectorId(profile.defaultSector);
  };

  const toggleLineage = () => {
      setLineage(prev => prev === Lineage.WIZARD ? Lineage.MUGGLE : Lineage.WIZARD);
  };

  const handleCreateItem = async (item: CarouselItem) => {
    if (!isAdmin) return;
    const { ok } = await safeFetch(`${API_URL}/api/admin/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify(item)
    });
    if(ok) fetchDbItems();
  };

  const handleUpdateItem = async (item: CarouselItem) => {
    if (!isAdmin) return;
    const { ok } = await safeFetch(`${API_URL}/api/admin/items/${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify(item)
    });
    if(ok) fetchDbItems();
  };

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin) return;
    const { ok } = await safeFetch(`${API_URL}/api/admin/items/${id}`, {
        method: 'DELETE', headers: { 'x-csrf-token': csrfToken }
    });
    if(ok) setDbItems(prev => prev.filter(i => i.id !== id));
  };

  // SUBJECT UPDATE LOGIC
  const handleUpdateSubject = async (oldName: string, newName: string, newImage?: string) => {
      if (!isAdmin) return;
      
      const subjectItems = dbItems.filter(i => (i.subject || 'General') === oldName);
      if (subjectItems.length === 0) return;

      // 1. Prepare updates for renaming
      const updates = subjectItems.map(item => ({...item, subject: newName}));

      // 2. Handle Image update
      if (newImage) {
          // Find the "cover item" (first one with image)
          const coverIndex = updates.findIndex(i => i.image && i.image.length > 0);
          
          if (coverIndex !== -1) {
              // Update existing cover item's image
              updates[coverIndex].image = newImage;
          } else if (updates.length > 0) {
              // No image exists in any item, assign to the first one to act as cover
              updates[0].image = newImage;
          }
      }

      // 3. Batch Process
      // We process sequentially to avoid overloading rate limits or connections
      for (const item of updates) {
          await safeFetch(`${API_URL}/api/admin/items/${item.id}`, {
              method: 'PUT', 
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, 
              body: JSON.stringify(item)
          });
      }
      
      // 4. Refresh
      fetchDbItems();
  };

  const handleViewItem = (item: CarouselItem) => setViewingItem(item);
  const handleEditItemRequest = (item: CarouselItem) => {
    setEditingItem(item);
    setAdminInitialTab('creator');
    setAdminPanelOpen(true);
  };

  const handleLoginSuccess = (token: string, perms: AdminPermissions) => {
    setIsAdmin(true);
    setCsrfToken(token);
    setPermissions(perms);
  };

  // PDF Detection
  const isPDF = (item: CarouselItem | null) => {
      if (!item) return false;
      const url = item.fileUrl?.toLowerCase() || '';
      const isDrive = url.includes('drive.google.com');
      const isPdfExtension = url.endsWith('.pdf');
      // Treat generic "file" type with drive link as PDF compatible
      return (item.type === 'file' || item.type === 'link') && (isPdfExtension || isDrive);
  };

  if (!configLoaded) return <LoadingSpinner lineage={null} color="#ffffff" />;

  if (!lineage) return <IdentityGate onSelect={handleLineageSelect} config={globalConfig} />;

  const isWizard = lineage === Lineage.WIZARD;
  const activeSector = sectors.find(s => s.id === activeSectorId) || sectors[0];
  
  const cursorStyle = globalConfig.cursorStyle || 'classic';
  const cursorClass = `cursor-${cursorStyle}-${isWizard ? 'wizard' : 'muggle'}`;

  const visualFilter = `brightness(${profile.brightness || 100}%) contrast(${profile.contrast || 100}%)`;
  const a11yClass = profile.highContrast ? 'contrast-125 brightness-110 saturate-150' : '';

  return (
    <div 
        className={`flex h-[100dvh] overflow-hidden transition-colors duration-1000 relative ${isWizard ? 'bg-[#050a05]' : 'bg-[#09050f]'} ${cursorClass} ${a11yClass}`} 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
        style={{ filter: visualFilter }}
    >
      <div className={`absolute inset-0 z-50 pointer-events-none ${isWizard ? 'parchment-grain' : 'crt-scanlines'}`}></div>
      
      <LiveBackground lineage={lineage} />

      <Sidebar 
        lineage={lineage} sectors={sectors} selectedSectorId={activeSectorId} 
        onSelectSector={setActiveSectorId} isOpen={sidebarOpen} setIsOpen={setSidebarOpen}
        onOpenSettings={() => { setAdminInitialTab('database'); setAdminPanelOpen(true); }} config={globalConfig}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden z-10 transition-all lg:ml-20">
        <HUD 
            lineage={lineage} 
            onToggleLineage={toggleLineage} 
            profile={profile} 
            onOpenOracle={() => setOracleOpen(true)}
            onOpenTools={() => setToolsOpen(true)}
            isOffline={isOffline} 
            config={globalConfig}
            onEditConfig={() => { setAdminInitialTab('config'); setAdminPanelOpen(true); }}
            onNavigate={setActiveSectorId}
        />

        <div className="flex-1 overflow-y-auto relative z-10 flex flex-col pb-24 md:pb-0 scroll-smooth">
          <div className="lg:hidden p-4">
            <button onClick={() => setSidebarOpen(true)} className={`p-2 rounded border ${isWizard ? 'border-emerald-500/30 text-emerald-400' : 'border-fuchsia-500/30 text-fuchsia-400'}`} style={profile.themeColor ? {borderColor: profile.themeColor, color: profile.themeColor} : {}}><Menu /></button>
          </div>

          <div className="px-6 py-8 md:px-12 md:py-12 text-center relative">
             <h2 className={`text-3xl md:text-5xl font-bold mb-4 tracking-wider ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`} style={profile.themeColor ? { color: profile.themeColor, textShadow: `0 0 20px ${profile.themeColor}50` } : {}}>{isWizard ? activeSector.wizardName : activeSector.muggleName}</h2>
             <p className={`max-w-2xl mx-auto text-sm md:text-base opacity-80 ${isWizard ? 'font-wizard text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>{activeSector.description}</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-4">
            {activeSectorId === 'announcements' && announcementViewMode === 'carousel' ? (
              <div className="w-full flex flex-col items-center gap-6 animate-[fade-in_0.5s] carousel-container no-swipe">
                 <Carousel items={currentViewItems} lineage={lineage} onExtract={handleViewItem} isAdmin={isAdmin && permissions?.canDelete} onDelete={handleDeleteItem} />
                 
                 {isAdmin && (
                    <div className="w-full max-w-md px-4">
                       <SectorView 
                          items={[]} 
                          lineage={lineage} sectorId={activeSectorId} onViewItem={() => {}}
                          isAdmin={true} onQuickCreate={handleCreateItem}
                          quickInputOnly={true} 
                          config={globalConfig}
                       />
                    </div>
                 )}

                 <button onClick={() => setAnnouncementViewMode('list')} className={`mt-4 px-6 py-2 rounded-full border backdrop-blur-sm flex items-center gap-2 transition-all ${isWizard ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-300' : 'bg-fuchsia-900/20 border-fuchsia-500/50 text-fuchsia-300'}`} style={profile.themeColor ? {borderColor: profile.themeColor, color: profile.themeColor, backgroundColor: `${profile.themeColor}20`} : {}}>
                     <LayoutList size={18} /> <span>{isWizard ? "Open Full Archives" : "View Database List"}</span>
                 </button>
              </div>
            ) : activeSectorId === 'system_info' ? (
                <Suspense fallback={<LoadingSpinner lineage={lineage} color={profile.themeColor}/>}>
                    <SystemInfoView lineage={lineage} isAdmin={isAdmin} />
                </Suspense>
            ) : (
              <Suspense fallback={<LoadingSpinner lineage={lineage} color={profile.themeColor}/>}>
                  <SectorView 
                    items={currentViewItems} lineage={lineage} sectorId={activeSectorId} onViewItem={handleViewItem}
                    isAdmin={isAdmin} onDelete={handleDeleteItem} onEdit={handleEditItemRequest}
                    onBack={activeSectorId === 'announcements' ? () => setAnnouncementViewMode('carousel') : undefined}
                    onAddItem={(sector) => { setEditingItem(null); setActiveSectorId(sector); setAdminInitialTab('creator'); setAdminPanelOpen(true); }}
                    onQuickCreate={handleCreateItem}
                    onUpdateSubject={handleUpdateSubject}
                    schedules={globalConfig.schedules} 
                    config={globalConfig}
                  />
              </Suspense>
            )}
          </div>

        </div>

        <div className="absolute bottom-6 left-6 z-40">
            <button onClick={() => setToolsOpen(true)} className={`p-3 rounded-full border shadow-lg transition-all hover:scale-110 active:scale-95 ${isWizard ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-400' : 'bg-fuchsia-900/80 border-fuchsia-500/50 text-fuchsia-400'}`} style={profile.themeColor ? {borderColor: profile.themeColor, color: profile.themeColor, backgroundColor: `${profile.themeColor}30`} : {}}><Briefcase size={20} /></button>
        </div>

        <Suspense fallback={null}>
            {toolsOpen && <ToolsModal lineage={lineage} onClose={() => setToolsOpen(false)} profile={profile} setProfile={setProfile} config={globalConfig} onToggleLineage={toggleLineage} />}
            <CommandCenter lineage={lineage} isOpen={commandCenterOpen} onClose={() => setCommandCenterOpen(false)} onImportItems={(items) => items.forEach(i => handleCreateItem(i))} />
            <OracleInterface lineage={lineage} isOpen={oracleOpen} onClose={() => setOracleOpen(false)} items={allGameData} />
            <AdminPanel 
                lineage={lineage} 
                isOpen={adminPanelOpen} 
                onClose={() => { setAdminPanelOpen(false); setEditingItem(null); }} 
                initialTab={adminInitialTab}
                isAdmin={isAdmin} 
                csrfToken={csrfToken} 
                currentUser={currentUser} 
                permissions={permissions} 
                onLogin={handleLoginSuccess} 
                onLogout={() => { setIsAdmin(false); setCsrfToken(''); }} 
                allItems={dbItems} 
                sectors={sectors} 
                globalConfig={globalConfig} 
                initialEditingItem={editingItem} 
                defaultSector={activeSectorId} 
                onAddItem={handleCreateItem} 
                onUpdateItem={handleUpdateItem} 
                onDeleteItem={handleDeleteItem} 
                onUpdateSectors={saveSectors} 
                onUpdateConfig={saveGlobalConfig} 
                onClearData={() => { localStorage.clear(); window.location.reload(); }} 
            />
            {/* Conditional Rendering for Viewer Type */}
            {viewingItem && (
                isPDF(viewingItem) ? (
                    <PDFViewer item={viewingItem} lineage={lineage} onClose={() => setViewingItem(null)} />
                ) : (
                    <ItemViewer item={viewingItem} lineage={lineage} onClose={() => setViewingItem(null)} />
                )
            )}
            <CommandPalette lineage={lineage} isOpen={cmdOpen} onClose={() => setCmdOpen(false)} onNavigate={setActiveSectorId} />
        </Suspense>
      </main>
    </div>
  );
};

export default App;