import React from 'react';
import { Lineage, SECTORS } from '../types';
import { 
  Shield, Server, Database, Lock, Eye, Activity, Cpu, Scroll, Info, AlertTriangle, 
  Terminal, Code, Globe, GraduationCap, Megaphone, BookOpen, Clock, PenTool, 
  Wrench, Palette, User, Sparkles, Wand2, Fingerprint, Search, Zap, Link as LinkIcon, FileText 
} from 'lucide-react';

interface SystemInfoViewProps {
  lineage: Lineage;
  isAdmin: boolean;
}

const SystemInfoView: React.FC<SystemInfoViewProps> = ({ lineage, isAdmin }) => {
  const isWizard = lineage === Lineage.WIZARD;

  // --- CONTENT DATA ---

  const aboutText = isWizard
    ? "Welcome, Apprentice, to the digital mirror of 'Core Connect'. This enchanted archive mimics the great scroll-network (Telegram) utilized by the scholars of the 2nd Semester (CSDA & AICS) at the Grand Academy of IIT Patna. It serves as a nexus for all knowledge, edicts, and schedules required for your magical studies."
    : "System initialized. This platform is a full-stack web replica of the 'Core Connect' Telegram channel, designed specifically for 2nd Semester CSDA & AICS students at IIT Patna. It aggregates academic resources, announcements, and scheduling data into a unified, interactive dashboard.";

  // NEW: Update Highlights
  const updates = [
      {
          icon: LinkIcon,
          title: isWizard ? "Portal Anchors (Deep Links)" : "URL Deep Linking",
          desc: isWizard 
            ? "The fabric of reality now remembers where you stand. Bookmarking a specific hall (e.g., /lectures) allows you to teleport there directly." 
            : "Navigation state is now synced with the browser URL. You can share or bookmark direct links to specific pages (e.g., /lectures)."
      },
      {
          icon: Zap,
          title: isWizard ? "Instant Apparition" : "Skip Intro Logic",
          desc: isWizard
            ? "For the swift sorcerer. A new spell in your Satchel (Tools) allows you to bypass the castle gates and materialize instantly."
            : "New Accessibility setting added. Enable 'Skip Intro & Gate' in the Tools menu to bypass the loading animation on startup."
      },
      {
           icon: FileText,
           title: isWizard ? "Restored Ancient Scrolls" : "PDF Core Upgrade",
           desc: isWizard
             ? "The magical lens has been polished. Google Drive artifacts and PDF scrolls now open reliably within the castle walls."
             : "Internal PDF viewer engine updated. Fixed compatibility issues with Google Drive links and embedded document rendering."
      }
  ];

  const userCapabilities = [
    {
      title: isWizard ? "Alter Reality (Customization)" : "UI Personalization",
      icon: Palette,
      desc: isWizard 
        ? "Open your Satchel (Tools) to change the fabric of this world. Dye the interface with new Soul Colors, or transcribe the text into ancient runes (Fonts) like 'Wizard Serif' or 'Cursive'."
        : "Access the Tools menu to customize the interface. Change accent colors, switch between 15+ fonts, and toggle High Contrast mode for accessibility."
    },
    {
      title: isWizard ? "Identity Transmutation" : "Profile Management",
      icon: User,
      desc: isWizard
        ? "Visit the Identity Gate to reshape your persona. Choose your House, update your Name, and see your Student ID card reflect your true self."
        : "Update your Display Name and viewing preferences. Your unique Visitor ID tracks your stats locally without compromising privacy."
    },
    {
      title: isWizard ? "Chronos & Tasks" : "Productivity Suite",
      icon: Clock,
      desc: isWizard
        ? "Use the 'Potion Timer' (Pomodoro) to focus your spellwork, or manage your quests on the 'Scroll Board' (Kanban)."
        : "Integrated Pomodoro timer with custom intervals and a Kanban board to track assignment progress (Todo/Doing/Done)."
    },
    {
      title: isWizard ? "Consult The Oracle" : "AI Assistance",
      icon: Sparkles,
      desc: isWizard
        ? "Summon the spirit in the machine. Ask the Oracle about anything in the archives, and it shall divine the answer from the scrolls."
        : "Use the integrated RAG (Retrieval-Augmented Generation) AI to chat with the database. It finds specific files or announcements instantly."
    }
  ];

  const sectorGuides = [
    {
      id: 'announcements',
      wizardTitle: "The Daily Prophet",
      muggleTitle: "Announcements",
      wizardDesc: "Edicts from the High Council (Moodle), college news, and critical updates regarding your academic fate.",
      muggleDesc: "Central feed for Moodle notifications, official college circulars, and general course announcements."
    },
    {
      id: 'lectures',
      wizardTitle: "Time-Turner Schedule",
      muggleTitle: "Lecture Schedule",
      wizardDesc: "Divines the time and location of your lessons. Shows active join links for astral projection (Online Class).",
      muggleDesc: "Real-time class schedule with recurring rules. Auto-generates 'Join Class' links and highlights active sessions."
    },
    {
      id: 'books',
      wizardTitle: "Restricted Section",
      muggleTitle: "Reference Books",
      wizardDesc: "Tombs of ancient knowledge. PDF scrolls and textbooks required for mastering the arts.",
      muggleDesc: "Digital library containing course textbooks, reference PDFs, and required reading materials."
    },
    {
      id: 'notes',
      wizardTitle: "Pensieve Memories",
      muggleTitle: "Lecture Notes",
      wizardDesc: "Captured thoughts from the masters. Handwritten scribbles and diagrams preserved for study.",
      muggleDesc: "Repository for class notes, whiteboard snapshots, and professor-provided slides."
    },
    {
      id: 'resources',
      wizardTitle: "Room of Requirement",
      muggleTitle: "Resources",
      wizardDesc: "Tools that appear when you need them. Links to external realms and helpful artifacts.",
      muggleDesc: "Curated list of external tools, coding platforms, software links, and helpful websites."
    },
    {
      id: 'tasks',
      wizardTitle: "O.W.L. Tasks",
      muggleTitle: "Tutorial Sheets",
      wizardDesc: "Challenges to prove your worth. Assignment sheets and practical magical exams.",
      muggleDesc: "Database of tutorial sheets, lab assignments, and practice problems."
    }
  ];

  return (
    <div className={`max-w-6xl mx-auto p-4 md:p-8 pb-32 space-y-16 animate-[fade-in_0.5s] ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
      
      {/* HERO SECTION */}
      <div className={`relative p-8 md:p-12 rounded-3xl border overflow-hidden text-center
        ${isWizard ? 'bg-[#0a0f0a] border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.1)]' : 'bg-[#0f0a15] border-fuchsia-500/50 shadow-[0_0_50px_rgba(217,70,239,0.1)]'}
      `}>
         <div className="relative z-10 space-y-6">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold tracking-widest uppercase
               ${isWizard ? 'bg-emerald-900/30 border-emerald-500 text-emerald-300' : 'bg-fuchsia-900/30 border-fuchsia-500 text-fuchsia-300'}
            `}>
               <GraduationCap size={14} /> IIT PATNA • CSDA & AICS
            </div>
            <h1 className={`text-4xl md:text-6xl font-bold tracking-wider leading-tight ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
               {isWizard ? "The Digital Archives" : "Core Connect Protocol"}
            </h1>
            <p className={`text-lg md:text-xl max-w-3xl mx-auto leading-relaxed ${isWizard ? 'font-wizard text-emerald-200/80' : 'font-muggle text-fuchsia-200/80'}`}>
               {aboutText}
            </p>
         </div>
         {/* Background Decor */}
         <div className={`absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none ${isWizard ? 'bg-[radial-gradient(circle_at_50%_50%,_#10b981_0%,_transparent_50%)]' : 'bg-[radial-gradient(circle_at_50%_50%,_#d946ef_0%,_transparent_50%)]'}`}></div>
      </div>

      {/* --- NEW UPDATES SECTION --- */}
      <div className="space-y-8">
         <div className="flex items-center gap-4">
             <div className={`h-px flex-1 ${isWizard ? 'bg-emerald-800' : 'bg-fuchsia-800'}`}></div>
             <h2 className={`text-2xl font-bold flex items-center gap-3 ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
               <Sparkles size={24}/> {isWizard ? "New Magic Discovered (v2.4.0)" : "System Patch Notes (v2.4.0)"}
             </h2>
             <div className={`h-px flex-1 ${isWizard ? 'bg-emerald-800' : 'bg-fuchsia-800'}`}></div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {updates.map((update, idx) => (
               <div key={idx} className={`p-6 rounded-xl border backdrop-blur-sm group hover:-translate-y-2 transition-all duration-300
                  ${isWizard 
                    ? 'bg-[#0f1510]/60 border-emerald-900/50 hover:border-emerald-500/50 hover:bg-emerald-900/20' 
                    : 'bg-[#150f1a]/60 border-fuchsia-900/50 hover:border-fuchsia-500/50 hover:bg-fuchsia-900/20'}
               `}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4
                     ${isWizard ? 'bg-emerald-500/20 text-emerald-400' : 'bg-fuchsia-500/20 text-fuchsia-400'}
                  `}>
                      <update.icon size={20} />
                  </div>
                  <h3 className={`text-lg font-bold mb-3 ${isWizard ? 'font-wizardTitle text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>
                     {update.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isWizard ? 'font-wizard text-zinc-400' : 'font-muggle text-zinc-400'}`}>
                     {update.desc}
                  </p>
               </div>
            ))}
         </div>
      </div>

      {/* SECTOR GUIDE */}
      <div className="space-y-8">
         <div className="flex items-center gap-4">
             <div className={`h-px flex-1 ${isWizard ? 'bg-emerald-800' : 'bg-fuchsia-800'}`}></div>
             <h2 className={`text-2xl font-bold flex items-center gap-3 ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
               <Globe size={24}/> {isWizard ? "Realms of Knowledge" : "Database Sectors"}
             </h2>
             <div className={`h-px flex-1 ${isWizard ? 'bg-emerald-800' : 'bg-fuchsia-800'}`}></div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectorGuides.map((sector) => (
               <div key={sector.id} className={`p-6 rounded-xl border backdrop-blur-sm group hover:-translate-y-2 transition-all duration-300
                  ${isWizard 
                    ? 'bg-[#0f1510]/60 border-emerald-900/50 hover:border-emerald-500/50 hover:bg-emerald-900/20' 
                    : 'bg-[#150f1a]/60 border-fuchsia-900/50 hover:border-fuchsia-500/50 hover:bg-fuchsia-900/20'}
               `}>
                  <h3 className={`text-xl font-bold mb-3 ${isWizard ? 'font-wizardTitle text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>
                     {isWizard ? sector.wizardTitle : sector.muggleTitle}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isWizard ? 'font-wizard text-zinc-400' : 'font-muggle text-zinc-400'}`}>
                     {isWizard ? sector.wizardDesc : sector.muggleDesc}
                  </p>
               </div>
            ))}
         </div>
      </div>

      {/* USER CAPABILITIES */}
      <div className="space-y-8">
         <div className="flex items-center gap-4">
             <div className={`h-px flex-1 ${isWizard ? 'bg-emerald-800' : 'bg-fuchsia-800'}`}></div>
             <h2 className={`text-2xl font-bold flex items-center gap-3 ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
               <User size={24}/> {isWizard ? "Apprentice Capabilities" : "User Functions"}
             </h2>
             <div className={`h-px flex-1 ${isWizard ? 'bg-emerald-800' : 'bg-fuchsia-800'}`}></div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userCapabilities.map((cap, idx) => (
               <div key={idx} className={`relative flex gap-4 p-6 rounded-xl border overflow-hidden
                  ${isWizard 
                    ? 'bg-[#0a0f0a] border-emerald-900/50' 
                    : 'bg-[#0f0a15] border-fuchsia-900/50'}
               `}>
                  <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center border
                     ${isWizard ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-fuchsia-900/20 border-fuchsia-500/30 text-fuchsia-400'}
                  `}>
                     <cap.icon size={24} />
                  </div>
                  <div>
                     <h3 className={`text-lg font-bold mb-2 ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>
                        {cap.title}
                     </h3>
                     <p className={`text-sm opacity-80 leading-relaxed ${isWizard ? 'text-zinc-300' : 'text-zinc-300'}`}>
                        {cap.desc}
                     </p>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* ADMIN PROTOCOLS (Conditional) */}
      <div className={`rounded-2xl border overflow-hidden
         ${isWizard ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-fuchsia-500/30 bg-fuchsia-950/20'}
      `}>
         <div className={`p-6 border-b flex items-center justify-between ${isWizard ? 'border-emerald-500/20 bg-emerald-900/10' : 'border-fuchsia-500/20 bg-fuchsia-900/10'}`}>
            <h3 className={`text-2xl font-bold flex items-center gap-3 ${isWizard ? 'text-emerald-100 font-wizardTitle' : 'text-fuchsia-100 font-muggle'}`}>
               <Shield size={24} /> {isWizard ? "High Council Protocols" : "Admin Privileges"}
            </h3>
            {!isAdmin && <Lock className="opacity-50 text-zinc-400" size={20} />}
         </div>
         
         <div className="p-6 md:p-8">
            {isAdmin ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                     { title: "Universal Edit", desc: "Modify, delete, or re-categorize any scroll or artifact in the database." },
                     { title: "AI Generation", desc: "Upload PDFs/Images and let the AI automatically extract title, content, and date." },
                     { title: "User Management", desc: "Create new admins and manage permission levels (Read/Write/God Mode)." },
                     { title: "System Config", desc: "Change the global theme images, titles, and alarm sounds instantly." },
                     { title: "Visitor Logs", desc: "Track who is visiting the archives and their engagement duration." },
                     { title: "Backup & Restore", desc: "Export the entire database as JSON and restore it in case of magical catastrophe." }
                  ].map((item, i) => (
                     <div key={i} className="flex gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>
                        <div>
                           <h4 className={`font-bold text-sm ${isWizard ? 'text-emerald-200' : 'text-fuchsia-200'}`}>{item.title}</h4>
                           <p className="text-xs text-zinc-300 mt-1">{item.desc}</p>
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="text-center py-8 opacity-60">
                  <Lock size={48} className={`mx-auto mb-4 opacity-50 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`} />
                  <p className={`max-w-md mx-auto text-zinc-300 ${isWizard ? 'font-wizard' : 'font-muggle'}`}>
                     {isWizard 
                        ? "These secrets are sealed by the Headmaster. Only those with the Elder Wand (Admin Key) may view the operational protocols."
                        : "Administrator access required. Please authenticate via the Settings panel to view system management protocols."}
                  </p>
               </div>
            )}
         </div>
      </div>

    </div>
  );
};

export default SystemInfoView;