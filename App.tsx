import React, { useState, useEffect, Suspense, useMemo, useCallback, useRef } from 'react';
import { 
  Lineage, Sector, GlobalConfig, CarouselItem, UserProfile, AdminPermissions, 
  SECTORS as DEFAULT_SECTORS, LectureRule, FONT_LIBRARY, UpdateAnnouncement 
} from './types';
import IdentityGate from './components/IdentityGate';
import Carousel from './components/Carousel';
import Sidebar from './components/Sidebar';
import HUD from './components/HUD';
import { SectorView } from './components/SectorViews';
import SystemInfoView from './components/SystemInfoView';
import ToolsModal from './components/ToolsModal';
import CommandCenter from './components/CommandCenter';
import OracleInterface from './components/OracleInterface';
import AdminPanel from './components/AdminPanel';
import PDFViewer from './components/PDFViewer';
import ItemViewer from './components/ItemViewer';
import CommandPalette from './components/CommandPalette';
import LiveBackground from './components/LiveBackground';
import { Menu, LayoutList, Briefcase, AlertTriangle, X, Sparkles, Zap, Link as LinkIcon, FileText } from 'lucide-react';
import { MY_FILES } from './telegramData';
import { API_URL } from './lib/config';
import { trackActivity } from './services/tracking';
import DOMPurify from 'dompurify';

const safeFetch = async (url: string, options: RequestInit = {}) => {
  try {
      const res = await fetch(url, { ...options, credentials: 'include' });
      if (!res.ok) {
         let errorMessage = `Request failed with status ${res.status}`;
         try {
             const data = await res.json();
             if (data.error) errorMessage = data.error;
         } catch (e) {
             // console.error("Non-JSON response received:", res.status);
         }
         throw new Error(errorMessage);
      }
      return res.json();
  } catch (e: any) {
      // console.error(`Fetch Error [${url}]:`, e.message);
      throw e; 
  }
};

const LoadingScanner: React.FC = () => {
    const [status, setStatus] = useState("SUMMONING ARCHIVES...");
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) return 100;
                // Non-linear progress for realism
                const increment = Math.random() * 2 + 0.5;
                return Math.min(100, prev + increment);
            });
        }, 50);

        const timeouts = [
            setTimeout(() => setStatus("ALIGNING LEY LINES..."), 1000),
            setTimeout(() => setStatus("DECRYPTING RUNES..."), 2500),
            setTimeout(() => setStatus("WEAVING REALITY..."), 3800),
            setTimeout(() => setStatus("GATEWAY OPENING..."), 4500)
        ];

        return () => {
            clearInterval(interval);
            timeouts.forEach(clearTimeout);
        };
    }, []);

    // Generate random particles
    const particles = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        duration: `${3 + Math.random() * 5}s`
    })), []);

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#020402] z-[200] overflow-hidden text-emerald-500 font-wizard select-none">
            {/* Background Particles */}
            <div className="absolute inset-0 pointer-events-none">
                {particles.map(p => (
                    <div 
                        key={p.id}
                        className="absolute w-1 h-1 bg-emerald-500/40 rounded-full animate-[float-particle_linear_infinite]"
                        style={{
                            left: p.left,
                            top: p.top,
                            animationDelay: p.delay,
                            animationDuration: p.duration
                        }}
                    ></div>
                ))}
            </div>

            {/* 3D SCENE CONTAINER */}
            <div className="relative w-96 h-96 flex items-center justify-center perspective-[1200px] mb-12 transform scale-75 md:scale-100">
                
                {/* Main Gyroscope Assembly */}
                <div className="relative w-64 h-64 transform-style-3d animate-[gyro-spin_10s_linear_infinite]">
                    
                    {/* Ring 1 (Outer) */}
                    <div className="absolute inset-0 border-[3px] border-emerald-500/30 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-[spin_4s_linear_infinite] border-t-emerald-300 border-l-transparent"></div>
                    
                    {/* Ring 2 (Middle) - Tilted */}
                    <div className="absolute inset-4 border-[2px] border-emerald-400/20 rounded-full animate-[reverse-spin_6s_linear_infinite]" style={{ transform: 'rotateX(60deg) rotateY(20deg)' }}>
                        <div className="absolute top-0 left-1/2 w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399]"></div>
                    </div>

                    {/* Ring 3 (Inner) - Tilted opposite */}
                    <div className="absolute inset-8 border-[2px] border-emerald-300/20 rounded-full animate-[spin_5s_linear_infinite]" style={{ transform: 'rotateY(60deg) rotateX(-20deg)' }}></div>

                    {/* CENTRAL HYPER-CUBE (Tesseract-ish) */}
                    <div className="absolute inset-0 m-auto w-24 h-24 transform-style-3d animate-[tumble_8s_linear_infinite]">
                        {/* Front Face */}
                        <div className="absolute inset-0 border border-emerald-400/40 bg-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)] translate-z-[12px]"></div>
                        {/* Back Face */}
                        <div className="absolute inset-0 border border-emerald-400/40 bg-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)] translate-z-[-12px]"></div>
                        {/* Right Face */}
                        <div className="absolute inset-0 border border-emerald-400/40 bg-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)] rotate-y-90 translate-z-[12px]"></div>
                        {/* Left Face */}
                        <div className="absolute inset-0 border border-emerald-400/40 bg-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)] rotate-y-90 translate-z-[-12px]"></div>
                        {/* Top Face */}
                        <div className="absolute inset-0 border border-emerald-400/40 bg-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)] rotate-x-90 translate-z-[12px]"></div>
                        {/* Bottom Face */}
                        <div className="absolute inset-0 border border-emerald-400/40 bg-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)] rotate-x-90 translate-z-[-12px]"></div>
                    </div>

                    {/* THE CORE SINGULARITY */}
                    <div className="absolute inset-0 m-auto w-4 h-4 bg-white rounded-full shadow-[0_0_60px_#10b981,0_0_30px_#fff] animate-pulse"></div>
                </div>
                
                {/* Floor Glow */}
                <div className="absolute -bottom-20 w-64 h-24 bg-emerald-500/10 blur-[40px] rounded-[100%] animate-pulse"></div>
            </div>

            {/* STATUS & LOADING BAR */}
            <div className="flex flex-col items-center gap-4 z-10 w-80 relative">
                {/* Glitchy Text Effect */}
                <div className="h-8 overflow-hidden relative w-full text-center">
                    <div className="text-xl font-bold tracking-[0.2em] uppercase text-emerald-100 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-[glitch_2s_infinite]">
                        {status}
                    </div>
                </div>
                
                {/* Magic Progress Bar */}
                <div className="w-full h-2 bg-emerald-950/50 rounded-full overflow-hidden border border-emerald-800/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] backdrop-blur-sm relative">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-900 via-emerald-500 to-emerald-200 transition-all duration-100 ease-linear relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-white shadow-[0_0_15px_white]"></div>
                    </div>
                </div>
                
                <div className="w-full flex justify-between text-[10px] text-emerald-400/60 font-mono tracking-widest uppercase">
                    <span>Constructing...</span>
                    <span>{Math.round(progress)}%</span>
                </div>
            </div>

            {/* CSS Styles for 3D Animations */}
            <style dangerouslySetInnerHTML={{__html: `
                .transform-style-3d { transform-style: preserve-3d; }
                .translate-z-\\[12px\\] { transform: translateZ(12px); }
                .translate-z-\\[-12px\\] { transform: translateZ(-12px); }
                .rotate-y-90 { transform: rotateY(90deg); }
                .rotate-x-90 { transform: rotateX(90deg); }
                
                @keyframes float-particle {
                    0% { transform: translateY(0) scale(0); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
                }
                
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes reverse-spin { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
                
                @keyframes gyro-spin {
                    0% { transform: rotateY(0deg) rotateX(0deg); }
                    100% { transform: rotateY(360deg) rotateX(360deg); }
                }

                @keyframes tumble {
                    0% { transform: rotate3d(1, 1, 1, 0deg); }
                    100% { transform: rotate3d(1, 1, 1, 360deg); }
                }

                @keyframes glitch {
                    0% { transform: translate(0); }
                    20% { transform: translate(-2px, 2px); }
                    40% { transform: translate(-2px, -2px); }
                    60% { transform: translate(2px, 2px); }
                    80% { transform: translate(2px, -2px); }
                    100% { transform: translate(0); }
                }
            `}} />
        </div>
    );
};

// --- HELPER FOR SYNC LOAD ---
const getSavedProfile = () => {
  try {
      const s = localStorage.getItem('core_connect_profile');
      return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
};

// --- DYNAMIC UPDATE POPUP COMPONENT (V2.5) ---
// Now accepts 'updateData' from config instead of being hardcoded
const UpdatePopup = ({ onClose, isWizard, accentColor, updateData }: { onClose: () => void, isWizard: boolean, accentColor: string, updateData: UpdateAnnouncement }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fade-in_0.5s]">
            <div className={`relative max-w-lg w-full p-1 rounded-xl shadow-2xl overflow-hidden bg-gradient-to-br ${isWizard ? 'from-emerald-900 to-black' : 'from-fuchsia-900 to-black'}`}>
                {/* Glow Border Effect */}
                <div className={`absolute inset-0 opacity-50 blur-xl ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>
                
                <div className={`relative bg-[#050505] rounded-lg p-6 border ${isWizard ? 'border-emerald-500/50' : 'border-fuchsia-500/50'} max-h-[80vh] flex flex-col`}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-full ${isWizard ? 'bg-emerald-500/20 text-emerald-400' : 'bg-fuchsia-500/20 text-fuchsia-400'} animate-pulse`}>
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h3 className={`text-xl font-bold ${isWizard ? 'text-emerald-100 font-wizardTitle' : 'text-fuchsia-100 font-muggle'}`}>
                                    {updateData.title || 'SYSTEM UPGRADE'}
                                </h3>
                                <p className="text-xs text-zinc-400 uppercase tracking-widest">Version {updateData.version} Live</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Dynamic Content */}
                    <div className="space-y-4 mb-8 overflow-y-auto custom-scrollbar flex-1">
                         <div 
                            className="text-zinc-300 text-sm leading-relaxed space-y-2 font-sans html-content"
                            dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(updateData.content || '<p>New features available.</p>') 
                            }} 
                         />
                    </div>

                    {/* Footer Button */}
                    <button 
                        onClick={onClose}
                        className={`w-full py-3 rounded-lg font-bold text-black transition-all hover:scale-[1.02] active:scale-95 shadow-lg shrink-0
                            ${isWizard ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-fuchsia-500 hover:bg-fuchsia-400'}
                        `}
                    >
                        {updateData.buttonText || 'ACKNOWLEDGE UPDATE'}
                    </button>
                </div>
            </div>
        </div>
    );
};


function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [currentUser, setCurrentUser] = useState('');
  
  // 1. Synchronously check preferences before first render
  const savedProfile = getSavedProfile();
  const shouldSkip = !!savedProfile?.skipIntro;
  const savedLineage = savedProfile?.lastLineage || null;

  // 2. Initialize states based on preferences
  const [configLoaded, setConfigLoaded] = useState(() => shouldSkip); 
  const [lineage, setLineage] = useState<Lineage | null>(() => shouldSkip && savedLineage ? savedLineage : null);

  const [activeSectorId, setActiveSectorId] = useState<string>('announcements');
  const [sectors, setSectors] = useState<Sector[]>(DEFAULT_SECTORS);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
      wizardTitle: 'Wizard OS', muggleTitle: 'Core OS', 
      wizardLogoText: 'W', muggleLogoText: 'C',
      wizardGateText: 'Enter the Void', muggleGateText: 'Init System',
      wizardAlarmUrl: '', muggleAlarmUrl: '',
      wizardImage: '', muggleImage: '',
      defaultFont: 'cinzel',
      schedules: [] // Ensure this is initialized
  });
  
  const [profile, setProfile] = useState<UserProfile>({
      id: 'guest', displayName: 'Guest', house: 'Sector-7', 
      visitCount: 1, totalTimeSpent: 0, lastActive: new Date().toISOString()
  });
  const [isOffline, setIsOffline] = useState(false);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  
  // Update Popup State
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'database' | 'creator' | 'scheduler' | 'config' | 'users' | 'visitors' | 'backup' | 'ai-lab' | 'structure'>('database');
  const [oracleOpen, setOracleOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  
  const [viewingItem, setViewingItem] = useState<CarouselItem | null>(null);
  const [announcementViewMode, setAnnouncementViewMode] = useState<'carousel' | 'list'>('carousel');
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);
  
  const profileRef = useRef(profile);

  // Profile Sync Ref
  useEffect(() => {
      profileRef.current = profile;
  }, [profile]);

  // Heartbeat Timer
  useEffect(() => {
      const interval = setInterval(() => {
          const p = profileRef.current; 
          if (p.id && p.id !== 'guest') {
              trackActivity(p.id, 'HEARTBEAT', '', '', 0, p.displayName);
          }
      }, 10000); 
      return () => clearInterval(interval);
  }, []); 

  // --- DYNAMIC UPDATE CHECKER (V2.5) ---
  useEffect(() => {
      // Check if popup is active in config AND if user hasn't seen this specific version
      if (configLoaded && globalConfig.updatePopup?.isActive && globalConfig.updatePopup.version) {
          const updateKey = `core_connect_update_v${globalConfig.updatePopup.version}`; // Unique key per version
          const hasSeen = localStorage.getItem(updateKey);
          
          if (!hasSeen) {
              // Small delay so it doesn't pop immediately over the intro fade-out
              const timer = setTimeout(() => setShowUpdatePopup(true), 2000);
              return () => clearTimeout(timer);
          }
      }
  }, [configLoaded, globalConfig.updatePopup]);

  const handleDismissUpdate = () => {
      if (globalConfig.updatePopup?.version) {
          const updateKey = `core_connect_update_v${globalConfig.updatePopup.version}`;
          localStorage.setItem(updateKey, 'true');
      }
      setShowUpdatePopup(false);
  };

  // Data Normalization
  const normalizedLocalFiles: CarouselItem[] = (MY_FILES as any[]).map(f => ({
      ...f,
      content: f.content || f.description || '',
      type: f.type || 'announcement', 
      isUnread: f.isUnread !== undefined ? f.isUnread : true,
      likes: f.likes || 0
  }));

  const [dbItems, setDbItems] = useState<CarouselItem[]>([...normalizedLocalFiles]);

  const fetchData = useCallback(async () => {
     try {
         const configRes = await fetch(`${API_URL}/api/config`).catch(() => null);
         if (configRes && configRes.ok) {
             const conf = await configRes.json();
             if (Object.keys(conf).length > 0) setGlobalConfig(conf);
         }
         
         const sectorsRes = await fetch(`${API_URL}/api/sectors`).catch(() => null);
         if (sectorsRes && sectorsRes.ok) {
             const sec = await sectorsRes.json();
             if (sec.length > 0) setSectors(sec);
         }

         const itemsRes = await fetch(`${API_URL}/api/items`).catch(() => null);
         if (itemsRes && itemsRes.ok) {
             const items = await itemsRes.json();
             if (Array.isArray(items)) {
                 const dbIds = new Set(items.map((i: any) => i.id));
                 const localUnique = normalizedLocalFiles.filter((l) => !dbIds.has(l.id));
                 const allItems = [...items, ...localUnique];
                 setDbItems(allItems);
             }
         } else {
             throw new Error("Failed to fetch items");
         }
         setIsOffline(false); 
         
     } catch(e) { 
         console.warn("Data refresh failed - Switching to Local Mode");
         if (!isOffline) {
             setIsOffline(true);
             if (dbItems.length === 0) {
                 setShowOfflineAlert(true);
             }
         }
     }
  }, [isOffline, dbItems.length]);

  // Initial Load & Visitor ID Generation
  useEffect(() => {
     const loadData = async () => {
         try {
             const localSaved = localStorage.getItem('core_connect_profile');
             let currentProfile = profile;
             
             if (localSaved) {
                 currentProfile = JSON.parse(localSaved);
                 setProfile(currentProfile);
             } else {
                 const newId = crypto.randomUUID();
                 const newProfile = { ...profile, id: newId };
                 setProfile(newProfile);
                 localStorage.setItem('core_connect_profile', JSON.stringify(newProfile));
                 currentProfile = newProfile;
             }

             trackActivity(currentProfile.id, 'HEARTBEAT', '', '', 0, currentProfile.displayName);

             await fetchData();
             try {
                 const meRes = await fetch(`${API_URL}/api/me`, { credentials: 'include' });
                 if (meRes.ok) {
                     const me = await meRes.json();
                     if (me.authenticated) {
                         setIsAdmin(true);
                         setCsrfToken(me.csrfToken);
                         setCurrentUser(me.username);
                         setPermissions(me.permissions);
                     }
                 }
             } catch (authError) {
                 console.debug("Not authenticated or offline.");
             }
         } catch(e) { 
             console.error(e); 
             setIsOffline(true);
             if (dbItems.length === 0) setShowOfflineAlert(true);
         }
         finally { 
             // Only run timeout if NOT skipping
             if (!shouldSkip) {
                setTimeout(() => setConfigLoaded(true), 4500); 
             }
         }
     };
     loadData();

     const handleKeyDown = (e: KeyboardEvent) => {
         if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
             e.preventDefault();
             setCmdOpen(prev => !prev);
         }
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchData, shouldSkip]); 

  useEffect(() => {
      if (adminPanelOpen) return;
      const interval = setInterval(() => {
          fetchData();
      }, 10000); 
      return () => clearInterval(interval);
  }, [adminPanelOpen, fetchData]);

  useEffect(() => {
      if (profile.id && activeSectorId && profile.id !== 'guest') {
          trackActivity(profile.id, 'ENTER_SECTOR', activeSectorId, activeSectorId, 0, profile.displayName);
      }
  }, [activeSectorId, profile.id, profile.displayName]);

  // --- FONT APPLICATION LOGIC ---
  const fontToUse = profile.preferredFont || globalConfig.defaultFont || 'cinzel';
  const selectedFont = useMemo(() => FONT_LIBRARY.find(f => f.id === fontToUse), [fontToUse]);

  useEffect(() => {
    if (selectedFont) {
        const linkId = `font-global-${selectedFont.id}`;
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.href = `https://fonts.googleapis.com/css2?family=${selectedFont.name.replace(/\s+/g, '+')}&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        const styleId = 'font-global-override';
        let style = document.getElementById(styleId) as HTMLStyleElement;
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }
        style.innerHTML = `
            body, .font-wizard, .font-wizardTitle, .font-muggle, .font-sans, .font-mono, .font-serif {
                font-family: ${selectedFont.family} !important;
            }
        `;
    } else {
        const style = document.getElementById('font-global-override');
        if (style) style.remove();
    }
  }, [selectedFont]);

  const currentViewItems = useMemo(() => {
      return dbItems.filter(i => i.sector === activeSectorId);
  }, [dbItems, activeSectorId]);

  const handleLineageSelect = (l: Lineage, name?: string) => {
      setLineage(l);
      
      let visitorId = profile.id;
      if (!visitorId || visitorId === 'guest') {
          visitorId = crypto.randomUUID();
      }
      const finalName = name || profile.displayName; 
      
      const newProfile = { ...profile, displayName: finalName, id: visitorId, lastLineage: l };
      setProfile(newProfile);
      
      localStorage.setItem('core_connect_profile', JSON.stringify(newProfile));
      trackActivity(newProfile.id, 'LOGIN', '', '', 0, finalName);
  };
  
  const toggleLineage = () => {
      const newLineage = lineage === Lineage.WIZARD ? Lineage.MUGGLE : Lineage.WIZARD;
      setLineage(newLineage);
      
      setProfile(prev => {
          const updated = { ...prev, lastLineage: newLineage };
          localStorage.setItem('core_connect_profile', JSON.stringify(updated));
          return updated;
      });
  };

  const handleCreateItem = async (item: CarouselItem) => {
      setDbItems(prev => [item, ...prev]);
      if (isAdmin && csrfToken) {
          try {
              const { isUnread, isLiked, likes, ...dbItem } = item;
              await safeFetch(`${API_URL}/api/admin/items`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                  body: JSON.stringify(dbItem)
              });
              fetchData(); 
          } catch(e) { console.error("Sync failed", e); }
      }
  };

  const handleUpdateItem = async (item: CarouselItem) => {
      setDbItems(prev => prev.map(i => i.id === item.id ? item : i));
      if (isAdmin && csrfToken) {
          try {
              const { isUnread, isLiked, likes, ...dbItem } = item;
              await safeFetch(`${API_URL}/api/admin/items/${item.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                  body: JSON.stringify(dbItem)
              });
          } catch(e) { console.error("Sync failed", e); }
      }
  };

  const handleDeleteItem = async (id: string) => {
      setDbItems(prev => prev.filter(i => i.id !== id));
      if (isAdmin && csrfToken) {
          try {
              await safeFetch(`${API_URL}/api/admin/items/${id}`, {
                  method: 'DELETE',
                  headers: { 'x-csrf-token': csrfToken }
              });
          } catch(e) { console.error("Sync failed", e); }
      }
  };

  const handleUpdateSubject = async (oldName: string, newName: string, newImage?: string) => {
      const updatedItems = dbItems.map(i => i.subject === oldName ? { ...i, subject: newName, image: (newImage && i.image === '') ? newImage : i.image } : i);
      setDbItems(updatedItems);
      if (isAdmin && csrfToken) {
          const itemsToUpdate = dbItems.filter(i => i.subject === oldName);
          for (const item of itemsToUpdate) {
              const newItem = { ...item, subject: newName, image: (newImage && item.image === '') ? newImage : item.image };
              try {
                  const { isUnread, isLiked, likes, ...dbItem } = newItem;
                  await safeFetch(`${API_URL}/api/admin/items/${item.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                      body: JSON.stringify(dbItem)
                  });
              } catch(e) {}
          }
      }
  };
  
  const handleReorder = async (updates: { id: string, order_index: number }[]) => {
      const updateMap = new Map(updates.map(u => [u.id, u.order_index]));
      setDbItems(prev => prev.map(item => {
          if (updateMap.has(item.id)) {
              return { ...item, order_index: updateMap.get(item.id) };
          }
          return item;
      }));
      if (isAdmin && csrfToken) {
          try {
              await safeFetch(`${API_URL}/api/admin/reorder`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                  body: JSON.stringify({ updates })
              });
          } catch(e) { console.error("Reorder sync failed", e); }
      }
  };

  const handleEditItemRequest = (item: CarouselItem) => {
      setEditingItem(item);
      setAdminInitialTab('creator');
      setAdminPanelOpen(true);
  };
  
  const saveSectors = async (newSectors: Sector[]) => {
      setSectors(newSectors);
      if (isAdmin && csrfToken) {
          await safeFetch(`${API_URL}/api/admin/sectors`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
              body: JSON.stringify(newSectors)
          });
      }
  };

  const saveGlobalConfig = async (newConfig: GlobalConfig) => {
      setGlobalConfig(newConfig);
      if (isAdmin && csrfToken) {
          await safeFetch(`${API_URL}/api/admin/config`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
              body: JSON.stringify(newConfig)
          });
      }
  };

  const handleLoginSuccess = (token: string, perms: AdminPermissions) => {
    setIsAdmin(true);
    setCsrfToken(token);
    setPermissions(perms);
    setCurrentUser('admin');
  };

  const handleLogout = async () => {
      try {
          await safeFetch(`${API_URL}/api/logout`, { method: 'POST' });
      } catch (e) {}
      setIsAdmin(false);
      setCsrfToken('');
      setPermissions(null);
      setCurrentUser('');
      setAdminPanelOpen(false);
  };

  const isPDF = (item: CarouselItem | null) => {
      if (!item || !item.fileUrl) return false;
      const url = item.fileUrl.toLowerCase();
      const isDrive = url.includes('drive.google.com');
      const isPdfExtension = url.endsWith('.pdf');
      if (isDrive || isPdfExtension) return true;
      return false;
  };

  const handleViewItem = (item: CarouselItem) => {
      trackActivity(profile.id, 'VIEW_ITEM', item.id, item.title, 0, profile.displayName);
      setViewingItem(item);
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest('.no-swipe')) return;
      setTouchStart(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStart) return;
      if ((e.target as HTMLElement).closest('.no-swipe')) return;
      const touchEnd = e.changedTouches[0].clientX;
      if (touchStart - touchEnd > 100) setSidebarOpen(false); 
      if (touchEnd - touchStart > 100) setSidebarOpen(true);
      setTouchStart(null);
  };

  // --- URL SYNC LOGIC ---
  useEffect(() => {
    const handleLocationChange = () => {
        const path = window.location.pathname.substring(1);
        const validIds = sectors.map(s => s.id);
        if (validIds.includes(path) || path === 'system_info') {
            setActiveSectorId(path);
        }
    };
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [sectors]);

  useEffect(() => {
    if (!configLoaded) return;
    const currentPath = window.location.pathname.substring(1);
    
    if (!lineage) {
        if (currentPath !== 'identity') window.history.pushState(null, '', '/identity');
        return;
    }
    
    if (currentPath !== activeSectorId) {
        window.history.pushState(null, '', `/${activeSectorId}`);
    }
  }, [activeSectorId, configLoaded, lineage]); 

  // --- RENDER CONDITIONALS ---
  
  if (!configLoaded) return <LoadingScanner />;

  if (!lineage) return <IdentityGate onSelect={handleLineageSelect} config={globalConfig} />;

  const isWizard = lineage === Lineage.WIZARD;
  const activeSector = sectors.find(s => s.id === activeSectorId) || sectors[0];
  
  const cursorStyle = globalConfig.cursorStyle || 'classic';
  const cursorClass = `cursor-${cursorStyle}-${isWizard ? 'wizard' : 'muggle'}`;
  const visualFilter = `brightness(${profile.brightness || 100}%) contrast(${profile.contrast || 100}%)`;
  const a11yClass = profile.highContrast ? 'contrast-125 brightness-110 saturate-150' : '';
  const accentColor = profile.themeColor || (isWizard ? '#10b981' : '#d946ef');
  
  return (
    <div 
        className={`flex h-[100dvh] overflow-hidden transition-colors duration-1000 relative ${isWizard ? 'bg-[#050a05]' : 'bg-[#09050f]'} ${cursorClass} ${a11yClass}`} 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
        style={{ filter: visualFilter }}
    >
      {/* Line removed to stop flickering */}
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
            <button onClick={() => setSidebarOpen(true)} className={`p-2 rounded border ${isWizard ? 'border-emerald-500/30 text-emerald-400' : 'border-fuchsia-500/30 text-fuchsia-400'}`}><Menu /></button>
          </div>

          <div className="px-6 py-8 md:px-12 md:py-12 text-center relative">
             <h2 
                className={`text-3xl md:text-5xl font-bold mb-4 tracking-wider ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`} 
                style={{ color: profile.themeColor ? accentColor : undefined }}
             >
                 {isWizard ? activeSector.wizardName : activeSector.muggleName}
             </h2>
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
                          sectors={sectors}
                       />
                    </div>
                 )}

                 <button onClick={() => setAnnouncementViewMode('list')} className={`mt-4 px-6 py-2 rounded-full border backdrop-blur-sm flex items-center gap-2 transition-all ${isWizard ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-300' : 'bg-fuchsia-900/20 border-fuchsia-500/30 text-fuchsia-300'}`}>
                     <LayoutList size={18} /> <span>{isWizard ? "Open Full Archives" : "View Database List"}</span>
                 </button>
              </div>
            ) : activeSectorId === 'system_info' ? (
                <Suspense fallback={null}>
                    <SystemInfoView lineage={lineage} isAdmin={isAdmin} />
                </Suspense>
            ) : (
              <Suspense fallback={null}>
                  <SectorView 
                    items={currentViewItems} 
                    allItems={dbItems}
                    lineage={lineage} sectorId={activeSectorId} onViewItem={handleViewItem}
                    isAdmin={isAdmin} onDelete={handleDeleteItem} onEdit={handleEditItemRequest}
                    onUpdateItem={handleUpdateItem}
                    onBack={activeSectorId === 'announcements' ? () => setAnnouncementViewMode('carousel') : undefined}
                    onAddItem={(sector) => { setEditingItem(null); setActiveSectorId(sector); setAdminInitialTab('creator'); setAdminPanelOpen(true); }}
                    onQuickCreate={handleCreateItem}
                    onUpdateSubject={handleUpdateSubject}
                    onReorder={handleReorder}
                    schedules={globalConfig.schedules} 
                    config={globalConfig}
                    sectors={sectors}
                  />
              </Suspense>
            )}
          </div>

        </div>

        <div className="absolute bottom-6 left-6 z-40">
            <button onClick={() => setToolsOpen(true)} className={`p-3 rounded-full border shadow-lg transition-all hover:scale-110 active:scale-95 ${isWizard ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-400' : 'bg-fuchsia-900/80 border-fuchsia-500/50 text-fuchsia-400'}`} style={{ borderColor: accentColor }}><Briefcase size={20} /></button>
        </div>

        {/* MODALS */}
        <Suspense fallback={null}>
            {/* NEW UPDATE POPUP - DYNAMIC */}
            {showUpdatePopup && globalConfig.updatePopup && (
                <UpdatePopup 
                    onClose={handleDismissUpdate} 
                    isWizard={isWizard} 
                    accentColor={accentColor} 
                    updateData={globalConfig.updatePopup} 
                />
            )}

            {showOfflineAlert && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fade-in_0.3s]">
                    <div className={`relative max-w-sm w-full p-6 rounded-xl border-2 shadow-2xl text-center ${isWizard ? 'bg-[#0a0f0a] border-red-500' : 'bg-[#0f0a15] border-red-500'}`}>
                        <div className="flex justify-center mb-4">
                            <div className="p-4 rounded-full bg-red-900/50 text-red-500 animate-pulse">
                                <AlertTriangle size={48} />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-red-100 mb-2">CONNECTION FAILURE</h3>
                        <p className="text-sm text-red-200/70 mb-6">
                            The archives are currently offline. This usually means the database keys are missing or the server is down. <br/><br/>
                            Application is running in <b>Local Mode</b>.
                        </p>
                        <button onClick={() => setShowOfflineAlert(false)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors">ACKNOWLEDGE</button>
                    </div>
                </div>
            )}
            {toolsOpen && (
                <ToolsModal lineage={lineage} onClose={() => setToolsOpen(false)} profile={profile} setProfile={setProfile} config={globalConfig} onToggleLineage={toggleLineage} />
            )}
            <CommandCenter lineage={lineage} isOpen={commandCenterOpen} onClose={() => setCommandCenterOpen(false)} onImportItems={(items) => items.forEach(i => handleCreateItem(i))} />
            <OracleInterface lineage={lineage} isOpen={oracleOpen} onClose={() => setOracleOpen(false)} items={dbItems} profile={profile} />
            <AdminPanel lineage={lineage} isOpen={adminPanelOpen} onClose={() => { setAdminPanelOpen(false); setEditingItem(null); }} initialTab={adminInitialTab} isAdmin={isAdmin} csrfToken={csrfToken} currentUser={currentUser} permissions={permissions} onLogin={handleLoginSuccess} onLogout={handleLogout} allItems={dbItems} sectors={sectors} globalConfig={globalConfig} initialEditingItem={editingItem} defaultSector={activeSectorId} onAddItem={handleCreateItem} onUpdateItem={handleUpdateItem} onDeleteItem={handleDeleteItem} onUpdateSectors={saveSectors} onUpdateConfig={saveGlobalConfig} onClearData={() => { localStorage.clear(); window.location.reload(); }} />
            {viewingItem && (isPDF(viewingItem) ? <PDFViewer item={viewingItem} lineage={lineage} onClose={() => setViewingItem(null)} /> : <ItemViewer item={viewingItem} lineage={lineage} onClose={() => setViewingItem(null)} />)}
            <CommandPalette lineage={lineage} isOpen={cmdOpen} onClose={() => setCmdOpen(false)} onNavigate={setActiveSectorId} />
        </Suspense>
      </main>
    </div>
  );
}

export default App;