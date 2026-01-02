
import React, { useState, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import IdentityGate from './components/IdentityGate';
import Sidebar from './components/Sidebar';
import Carousel from './components/Carousel';
import HUD from './components/HUD';
import { Lineage, SECTORS, type CarouselItem, type UserProfile, type Sector, type AdminPermissions } from './types';
import { Menu, Briefcase, Lock, LayoutList, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

// Lazy Load Heavy/Modal Components
const SectorView = lazy(() => import('./components/SectorViews'));
const ToolsModal = lazy(() => import('./components/ToolsModal'));
const ItemViewer = lazy(() => import('./components/ItemViewer'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const CommandCenter = lazy(() => import('./components/CommandCenter'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const OracleInterface = lazy(() => import('./components/OracleInterface'));

// SECURITY: Define the API URL based on environment.
// On Vercel, we can use an empty string to denote "same origin" (relative path), eliminating CORS.
const getEnvVar = (key: string) => {
  try { return (import.meta as any).env?.[key]; } catch { return undefined; }
};

// If VITE_API_URL is set, use it. Otherwise, defaults to '' (same origin) for Vercel.
export const API_URL = (getEnvVar('VITE_API_URL') || '').replace(/\/$/, '');

// Helper for Robust Fetching
// Handles 401/403/500 errors gracefully without crashing the UI
async function safeFetch(url: string, options: RequestInit = {}) {
    try {
        // SECURITY: Always include credentials for cookies
        const defaultOptions: RequestInit = {
            ...options,
            credentials: 'include', 
        };
        
        const res = await fetch(url, defaultOptions);
        const text = await res.text();
        
        try {
            const json = JSON.parse(text);
            return { ok: res.ok, data: json, status: res.status };
        } catch (e) {
            console.warn(`[SafeFetch] Non-JSON response from ${url}:`, text.substring(0, 50));
            return { ok: false, data: { error: "Server returned invalid response" }, status: res.status };
        }
    } catch (e) {
        console.warn(`[Offline Mode] Backend unreachable at ${url}.`);
        return { ok: false, data: { error: "Network Error - Backend unreachable" }, status: 0 };
    }
}

export interface GlobalConfig {
  wizardTitle: string;
  muggleTitle: string;
  wizardLogoText: string;
  muggleLogoText: string;
  wizardGateText: string;
  muggleGateText: string;
  wizardAlarmUrl: string;
  muggleAlarmUrl: string;
  wizardImage: string;
  muggleImage: string;
  wizardLogoUrl?: string; 
  muggleLogoUrl?: string; 
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
  muggleImage: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop'
};

const LoadingSpinner = ({ lineage, color }: { lineage: Lineage | null, color?: string }) => (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm`} style={{color: color || (lineage === Lineage.WIZARD ? '#10b981' : '#d946ef')}}>
        <Loader2 size={40} className="animate-spin" />
    </div>
);

const App: React.FC = () => {
  const [lineage, setLineage] = useState<Lineage | null>(null);
  const [activeSectorId, setActiveSectorId] = useState<string>('announcements');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data State
  const [dbItems, setDbItems] = useState<CarouselItem[]>([]);
  
  // GOD MODE STATES
  const [sectors, setSectors] = useState<Sector[]>(SECTORS);

  // Initialize Config from LocalStorage to prevent flicker/reset
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(() => {
    try {
      const saved = localStorage.getItem('core_connect_global_config_v2');
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [isOffline, setIsOffline] = useState(false);
  const [announcementViewMode, setAnnouncementViewMode] = useState<'carousel' | 'list'>('carousel');

  // Security State
  const [isAdmin, setIsAdmin] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<string>('');
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  
  // --- USER PROFILE & VISITOR TRACKING ---
  const [profile, setProfile] = useState<UserProfile>(() => {
      try {
          const saved = localStorage.getItem('core_connect_profile');
          if (saved) return JSON.parse(saved);
      } catch (e) {}
      // Default Profile
      return {
          id: crypto.randomUUID(), // Generate visitor ID
          displayName: '',
          house: 'Griffindor',
          totalTimeSpent: 0,
          visitCount: 1,
          lastActive: new Date().toISOString()
      };
  });

  const [toolsOpen, setToolsOpen] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [oracleOpen, setOracleOpen] = useState(false); 
  const [viewingItem, setViewingItem] = useState<CarouselItem | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);

  // Track Time Spent
  useEffect(() => {
      const interval = setInterval(() => {
          setProfile(prev => ({
              ...prev,
              totalTimeSpent: prev.totalTimeSpent + 1,
              lastActive: new Date().toISOString()
          }));
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  // Persist Profile & Send Heartbeat
  useEffect(() => {
      localStorage.setItem('core_connect_profile', JSON.stringify(profile));
      
      // Send Heartbeat every 30 seconds to update server stats
      if (profile.totalTimeSpent % 30 === 0) {
          safeFetch(`${API_URL}/api/visitor/heartbeat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  visitorId: profile.id,
                  displayName: profile.displayName,
                  timeSpent: profile.totalTimeSpent,
                  visitCount: profile.visitCount
              })
          });
      }
  }, [profile]);

  // Apply User Preferences
  useEffect(() => {
      if (profile.preferredFont) {
          const fontMap: Record<string, string> = {
              'wizard': '"EB Garamond", serif',
              'muggle': '"JetBrains Mono", monospace',
              'sans': '"Inter", sans-serif',
              'playfair': '"Playfair Display", serif',
              'orbitron': '"Orbitron", sans-serif',
              'montserrat': '"Montserrat", sans-serif',
              'courier': '"Courier Prime", monospace',
          };
          document.body.style.fontFamily = fontMap[profile.preferredFont] || '';
      }
      if (profile.defaultSector && !lineage) {
          // Logic handled in IdentityGate or initialization if needed,
          // but usually we wait for user to pick lineage.
      }
  }, [profile.preferredFont, profile.defaultSector, lineage]);

  // --- DYNAMIC FAVICON LOGIC ---
  useEffect(() => {
    const link = document.getElementById('dynamic-favicon') as HTMLLinkElement;
    if (link) {
      if (lineage === Lineage.WIZARD) {
        link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦉</text></svg>";
        document.title = globalConfig.wizardTitle || "Avada Kedavra";
      } else if (lineage === Lineage.MUGGLE) {
        link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💾</text></svg>";
        document.title = globalConfig.muggleTitle || "Core.Arch";
      } else {
        link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>";
      }
    }
  }, [lineage, globalConfig.wizardTitle, globalConfig.muggleTitle]);

  // Load Saved Configuration
  useEffect(() => {
    const savedSectors = localStorage.getItem('core_connect_sectors');
    if (savedSectors) setSectors(JSON.parse(savedSectors));
    
    const fetchConfig = async () => {
      const { ok, data, status } = await safeFetch(`${API_URL}/api/config`);
      if (ok && data) {
          setGlobalConfig(prev => {
             const { showDemoData, ...cleanData } = data;
             const newData = {...prev, ...cleanData};
             localStorage.setItem('core_connect_global_config_v2', JSON.stringify(newData));
             return newData;
          });
          setIsOffline(false);
      } else if (status === 0) {
          setIsOffline(true);
      }
    };
    fetchConfig();
  }, []);

  const saveSectors = (newSectors: Sector[]) => {
    setSectors(newSectors);
    localStorage.setItem('core_connect_sectors', JSON.stringify(newSectors));
  };

  const saveGlobalConfig = async (newConfig: GlobalConfig) => {
    setGlobalConfig(newConfig);
    localStorage.setItem('core_connect_global_config_v2', JSON.stringify(newConfig));
    
    if (isAdmin && csrfToken && permissions?.canEdit) {
      await safeFetch(`${API_URL}/api/admin/config`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken 
          },
          body: JSON.stringify(newConfig)
      });
    }
  };

  // Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      const { ok, data } = await safeFetch(`${API_URL}/api/me`);
      if (ok && data && data.authenticated) {
          setIsAdmin(true);
          setCsrfToken(data.csrfToken);
          setPermissions(data.permissions);
          setCurrentUser(data.username);
      }
    };
    checkAuth();
  }, []);

  const fetchDbItems = async () => {
      try {
          const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
          if (data && !error) {
              const mappedItems: CarouselItem[] = data.map((d: any) => ({
                  id: d.id,
                  title: d.title,
                  content: d.content,
                  date: d.date,
                  type: d.type as any,
                  subject: d.subject,
                  image: d.image,
                  fileUrl: d.file_url,
                  author: d.author,
                  likes: d.likes || 0,
                  isUnread: d.is_unread, 
                  isLiked: false,
                  sector: d.sector,
                  style: d.style
              }));
              setDbItems(mappedItems);
          }
      } catch (e) { console.warn("DB Fetch Warning (Offline?):", e); }
  };

  useEffect(() => {
    fetchDbItems();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- SWIPE GESTURE LOGIC ---
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartX.current || !touchStartY.current) return;
      
      // Ignore swipes on sliders/carousels or inner scroll areas
      const target = e.target as HTMLElement;
      if (target.closest('.overflow-x-auto') || target.closest('.carousel-container') || target.closest('.no-swipe')) {
          return;
      }

      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      const diffY = touchStartY.current - e.changedTouches[0].clientY;

      // Ensure horizontal swipe is dominant and significant
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
          const currentIdx = sectors.findIndex(s => s.id === activeSectorId);
          if (diffX > 0) { // Swipe Left -> Next
              const nextIdx = (currentIdx + 1) % sectors.length;
              setActiveSectorId(sectors[nextIdx].id);
          } else { // Swipe Right -> Prev
              const prevIdx = (currentIdx - 1 + sectors.length) % sectors.length;
              setActiveSectorId(sectors[prevIdx].id);
          }
      }
      
      touchStartX.current = null;
      touchStartY.current = null;
  };

  // --- ORACLE CONTEXT ---
  const allGameData = useMemo(() => {
      if (!lineage) return [];
      let combined = [...dbItems];
      return combined.sort((a, b) => {
          const dateA = new Date(a.date.replace(/\./g, '-'));
          const dateB = new Date(b.date.replace(/\./g, '-'));
          return dateB.getTime() - dateA.getTime();
      });
  }, [lineage, dbItems]);

  const currentViewItems = useMemo(() => {
      return allGameData.filter(i => i.sector === activeSectorId);
  }, [allGameData, activeSectorId]);

  // Initial Lineage Selection Logic
  const handleLineageSelect = (l: Lineage) => {
      setLineage(l);
      // Increment stats
      setProfile(prev => ({ ...prev, visitCount: prev.visitCount + 1 }));
      // Set default sector from profile if available
      if (profile.defaultSector) {
          setActiveSectorId(profile.defaultSector);
      }
  };

  useEffect(() => {
      if (lineage) {
          if (profile.house === 'Griffindor' && lineage === Lineage.MUGGLE) {
             setProfile(prev => ({...prev, house: 'Sector-7'}));
          }
          if (activeSectorId !== 'announcements') {
            setAnnouncementViewMode('carousel');
          }
      }
  }, [lineage, activeSectorId]);

  const handleViewItem = (item: CarouselItem) => setViewingItem(item);

  // --- API HANDLERS ---
  const handleCreateItem = async (newItem: CarouselItem) => {
    if (!isAdmin || !permissions?.canEdit) return;
    const { ok, data } = await safeFetch(`${API_URL}/api/admin/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(newItem)
    });

    if (ok) {
        fetchDbItems(); 
    } else {
        alert("Create failed: " + (data?.error || "Unknown Error"));
    }
  };
  
  const handleUpdateItem = async (updatedItem: CarouselItem) => {
    if (!isAdmin || !permissions?.canEdit) return;
    const { ok, data } = await safeFetch(`${API_URL}/api/admin/items/${updatedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(updatedItem)
    });

    if (ok) {
        fetchDbItems(); 
    } else {
        alert("Update failed: " + (data?.error || "Unknown Error"));
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if(!permissions?.canDelete) { alert("Permission Denied"); return; }
    
    if (isAdmin) {
        const { ok } = await safeFetch(`${API_URL}/api/admin/items/${itemId}`, {
            method: 'DELETE',
            headers: { 'x-csrf-token': csrfToken }
        });
        
        if (ok) {
            setDbItems(prev => prev.filter(i => i.id !== itemId));
        } else {
            alert("Delete Failed");
        }
    }
  };

  const handleEditItemRequest = (item: CarouselItem) => {
      setEditingItem(item);
      setAdminPanelOpen(true);
  };

  const handleFactoryReset = () => {
    if(confirm("Are you sure? This will delete all custom settings locally. Database items require manual deletion.")) {
      localStorage.removeItem('core_connect_sectors');
      localStorage.removeItem('core_connect_global_config_v2');
      localStorage.removeItem('core_connect_profile');
      setSectors(SECTORS);
      setGlobalConfig(DEFAULT_CONFIG);
      window.location.reload();
    }
  };

  const handleImportItems = (newItems: CarouselItem[]) => {
      newItems.forEach(item => handleCreateItem(item));
  };
  
  const toggleLineage = () => setLineage(prev => prev === Lineage.WIZARD ? Lineage.MUGGLE : Lineage.WIZARD);

  const handleLoginSuccess = (token: string, perms: AdminPermissions) => { 
      setIsAdmin(true); 
      setCsrfToken(token); 
      setPermissions(perms);
  };
  const handleLogout = () => { 
      setIsAdmin(false); 
      setCsrfToken(''); 
      setPermissions(null); 
      setCurrentUser('');
  };

  if (!lineage) {
    return (
      <IdentityGate 
        onSelect={handleLineageSelect} 
        config={globalConfig}
      />
    );
  }

  const isWizard = lineage === Lineage.WIZARD;
  const activeSector = sectors.find(s => s.id === activeSectorId) || sectors[0];

  return (
    <div 
        className={`flex h-screen overflow-hidden transition-colors duration-1000 relative ${isWizard ? 'bg-[#050a05] cursor-wizard' : 'bg-[#09050f] cursor-muggle'}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
    >
      
      <div className={`absolute inset-0 z-50 pointer-events-none ${isWizard ? 'parchment-grain' : 'crt-scanlines'}`}></div>
      {!isWizard && <div className="absolute inset-0 z-50 pointer-events-none crt-vignette"></div>}

      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {isWizard ? (
             <>
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-900/10 blur-[120px] rounded-full animate-pulse-slow" style={profile.themeColor ? {backgroundColor: `${profile.themeColor}10`} : {}}></div>
               <div className="firefly" style={{ top: '20%', left: '30%', animationDelay: '0s' }}></div>
               <div className="firefly" style={{ top: '60%', left: '70%', animationDelay: '2s' }}></div>
             </>
          ) : (
             <>
               <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-fuchsia-900/10 blur-[100px] rounded-full animate-pulse-slow" style={profile.themeColor ? {backgroundColor: `${profile.themeColor}10`} : {}}></div>
               <div className="matrix-rain" style={{ top: '10%', left: '20%', animationDuration: '3s' }}>101010</div>
             </>
          )}
      </div>

      <Sidebar 
        lineage={lineage} 
        sectors={sectors} 
        selectedSectorId={activeSectorId} 
        onSelectSector={setActiveSectorId}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onOpenSettings={() => setAdminPanelOpen(true)}
        config={globalConfig}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden z-10 transition-all lg:ml-20">
        
        <HUD 
          lineage={lineage} 
          onToggleLineage={toggleLineage} 
          profile={profile}
          onOpenOracle={() => setOracleOpen(true)} 
          isOffline={isOffline}
        />

        <div className="flex-1 overflow-y-auto relative z-10 flex flex-col pb-24 md:pb-0" id="main-scroll-area">
          <div className="lg:hidden p-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded border ${isWizard ? 'border-emerald-500/30 text-emerald-400' : 'border-fuchsia-500/30 text-fuchsia-400'}`}
              style={profile.themeColor ? {borderColor: profile.themeColor, color: profile.themeColor} : {}}
            >
              <Menu />
            </button>
          </div>

          <div className="px-6 py-8 md:px-12 md:py-12 text-center relative group">
             {isAdmin && (
               <div className={`absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold rounded-b uppercase tracking-widest flex items-center gap-2
                 ${isWizard ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'}
               `}>
                 <Lock size={10} /> Authenticated ({currentUser})
               </div>
             )}
             <h2 className={`text-3xl md:text-5xl font-bold mb-4 tracking-wider
               ${isWizard ? 'font-wizardTitle text-emerald-100 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'font-muggle text-fuchsia-100 drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]'}
             `}
             style={profile.themeColor ? { color: profile.themeColor, textShadow: `0 0 20px ${profile.themeColor}50` } : {}}
             >
               {isWizard ? activeSector.wizardName : activeSector.muggleName}
             </h2>
             <p className={`max-w-2xl mx-auto text-sm md:text-base opacity-80 ${isWizard ? 'font-wizard text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>
               {activeSector.description}
             </p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-4">
            {activeSectorId === 'announcements' && announcementViewMode === 'carousel' ? (
              <div className="w-full flex flex-col items-center gap-6 animate-[fade-in_0.5s] carousel-container">
                 <Carousel 
                    items={currentViewItems} 
                    lineage={lineage} 
                    onExtract={handleViewItem}
                    isAdmin={isAdmin && permissions?.canDelete}
                    onDelete={handleDeleteItem}
                  />
                  <button 
                    onClick={() => setAnnouncementViewMode('list')}
                    className={`mt-4 px-6 py-2 rounded-full border backdrop-blur-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95
                      ${isWizard 
                        ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/40' 
                        : 'bg-fuchsia-900/20 border-fuchsia-500/50 text-fuchsia-300 hover:bg-fuchsia-900/40'}
                    `}
                    style={profile.themeColor ? {borderColor: profile.themeColor, color: profile.themeColor, backgroundColor: `${profile.themeColor}20`} : {}}
                  >
                     <LayoutList size={18} />
                     <span className={isWizard ? 'font-wizard' : 'font-muggle text-sm'}>
                        {isWizard ? "Open Full Archives" : "View Database List"}
                     </span>
                  </button>
              </div>
            ) : (
              <Suspense fallback={<LoadingSpinner lineage={lineage} color={profile.themeColor}/>}>
                  <SectorView 
                    items={currentViewItems} 
                    lineage={lineage} 
                    sectorId={activeSectorId}
                    onViewItem={handleViewItem}
                    isAdmin={isAdmin}
                    onDelete={permissions?.canDelete ? handleDeleteItem : undefined}
                    onEdit={permissions?.canEdit ? handleEditItemRequest : undefined}
                    onBack={activeSectorId === 'announcements' ? () => setAnnouncementViewMode('carousel') : undefined}
                    onAddItem={(sector) => { setEditingItem(null); setActiveSectorId(sector); setAdminPanelOpen(true); }}
                    onQuickCreate={handleCreateItem}
                  />
              </Suspense>
            )}
          </div>
        </div>

        <div className="absolute bottom-6 left-6 z-30">
            <button
              onClick={() => setToolsOpen(true)}
              className={`p-3 rounded-full border shadow-lg transition-all hover:scale-110 active:scale-95
               ${isWizard 
                 ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/60' 
                 : 'bg-fuchsia-900/30 border-fuchsia-500/50 text-fuchsia-400 hover:bg-fuchsia-900/60'}
              `}
              style={profile.themeColor ? {borderColor: profile.themeColor, color: profile.themeColor, backgroundColor: `${profile.themeColor}30`} : {}}
              title="Student Tools & Profile"
            >
              <Briefcase size={20} />
            </button>
        </div>

        <Suspense fallback={null}>
            {toolsOpen && (
              <ToolsModal 
                lineage={lineage} 
                onClose={() => setToolsOpen(false)} 
                profile={profile} 
                setProfile={setProfile}
                config={globalConfig}
              />
            )}

            <CommandCenter 
              lineage={lineage} 
              isOpen={commandCenterOpen} 
              onClose={() => setCommandCenterOpen(false)} 
              onImportItems={handleImportItems}
            />

            <OracleInterface
               lineage={lineage}
               isOpen={oracleOpen}
               onClose={() => setOracleOpen(false)}
               items={allGameData} 
            />

            <AdminPanel 
              lineage={lineage}
              isOpen={adminPanelOpen}
              onClose={() => { setAdminPanelOpen(false); setEditingItem(null); }}
              isAdmin={isAdmin}
              csrfToken={csrfToken}
              currentUser={currentUser}
              permissions={permissions}
              onLogin={handleLoginSuccess}
              onLogout={handleLogout}
              
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
              onClearData={handleFactoryReset}
            />

            {viewingItem && (
              <ItemViewer 
                item={viewingItem} 
                lineage={lineage} 
                onClose={() => setViewingItem(null)} 
              />
            )}
            
            <CommandPalette 
              lineage={lineage} 
              isOpen={cmdOpen} 
              onClose={() => setCmdOpen(false)} 
              onNavigate={(id) => setActiveSectorId(id)}
            />
        </Suspense>
      </main>
    </div>
  );
};

export default App;
