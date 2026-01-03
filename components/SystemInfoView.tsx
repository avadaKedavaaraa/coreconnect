
import React from 'react';
import { Lineage } from '../types';
import { Shield, Server, Database, Lock, Eye, Activity, Cpu, Scroll, Info, AlertTriangle, Terminal, Code } from 'lucide-react';

interface SystemInfoViewProps {
  lineage: Lineage;
  isAdmin: boolean;
}

const SystemInfoView: React.FC<SystemInfoViewProps> = ({ lineage, isAdmin }) => {
  const isWizard = lineage === Lineage.WIZARD;

  const sections = [
    {
      title: isWizard ? "Archive Architecture" : "System Architecture",
      icon: isWizard ? Scroll : Server,
      content: isWizard 
        ? "This archive is constructed upon ancient ley lines of digital mana (React.js). The structure utilizes a component-based spell structure to ensure stability across all magical devices. Data is stored within the Supabase Vaults, protected by Row Level Security wards."
        : "CoreConnect utilizes a modular React.js frontend architecture backed by a scalable Supabase PostgreSQL database. The application employs optimistic UI updates and responsive design principles to ensure seamless access across desktop and mobile viewports."
    },
    {
      title: isWizard ? "Wards & Security" : "Security Protocols",
      icon: isWizard ? Shield : Lock,
      content: isWizard
        ? "Protective enchantments prevent unauthorized scrying. The Identity Gate acts as the first line of defense, requiring a soul-name to pass. All scrolls are enchanted with non-fungible preservation charms."
        : "The platform implements strict Cross-Origin Resource Sharing (CORS) policies and Helmet security headers. API endpoints are rate-limited to prevent DDoS attacks. All data transmission is encrypted via TLS 1.3."
    },
    {
      title: isWizard ? "The Oracle Engine" : "AI Integration",
      icon: isWizard ? Eye : Cpu,
      content: isWizard
        ? "A captured spirit of intellect (Gemini AI) powers the Oracle interface. It can read the contents of the archives and summarize them for seekers of knowledge. It is bound by the 'System Instruction' spell to remain helpful and context-aware."
        : "The integrated AI assistant leverages the Gemini 3 Flash model for Retrieval-Augmented Generation (RAG). It dynamically parses the current database context to answer user queries with high accuracy and relevance to the stored data."
    }
  ];

  return (
    <div className={`max-w-5xl mx-auto p-6 pb-20 space-y-12 animate-[fade-in_0.5s] ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
      
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className={`text-4xl md:text-5xl font-bold tracking-wider ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
          {isWizard ? "The Ministry Archives" : "System Protocols v2.4"}
        </h2>
        <div className={`h-1 w-24 mx-auto rounded-full ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>
        <p className={`max-w-2xl mx-auto opacity-70 ${isWizard ? 'font-wizard text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>
          {isWizard 
            ? "Herein lies the knowledge of the system's inner workings. Tread carefully."
            : "Documentation regarding operational parameters, stack details, and privacy standards."}
        </p>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className={`p-6 rounded-xl border backdrop-blur-md flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300
            ${isWizard 
              ? 'bg-[#0a0f0a]/80 border-emerald-900/50 hover:border-emerald-500/30' 
              : 'bg-[#0f0a15]/80 border-fuchsia-900/50 hover:border-fuchsia-500/30'}
          `}>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isWizard ? 'bg-emerald-900/30 text-emerald-400' : 'bg-fuchsia-900/30 text-fuchsia-400'}`}>
              <section.icon size={24} />
            </div>
            <h3 className={`text-xl font-bold ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
              {section.title}
            </h3>
            <p className={`text-sm leading-relaxed opacity-70 ${isWizard ? 'font-wizard' : 'font-muggle'}`}>
              {section.content}
            </p>
          </div>
        ))}
      </div>

      {/* PRIVACY SECTION (Conditional Content) */}
      <div className={`rounded-2xl border overflow-hidden
        ${isWizard ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-fuchsia-500/30 bg-fuchsia-950/20'}
      `}>
        <div className={`p-6 border-b ${isWizard ? 'border-emerald-500/20 bg-emerald-900/10' : 'border-fuchsia-500/20 bg-fuchsia-900/10'}`}>
           <h3 className={`text-2xl font-bold flex items-center gap-3 ${isWizard ? 'text-emerald-100 font-wizardTitle' : 'text-fuchsia-100 font-muggle'}`}>
             <Activity size={24} /> {isWizard ? "Surveillance & Privacy" : "Data & Privacy Policy"}
           </h3>
        </div>
        
        <div className="p-6 md:p-8 space-y-6">
           {isAdmin ? (
             /* --- ADMIN VIEW (Detailed) --- */
             <div className="space-y-6">
                <div className={`p-4 rounded border border-yellow-500/30 bg-yellow-900/10 flex items-start gap-3`}>
                   <AlertTriangle className="text-yellow-500 shrink-0 mt-1" size={20} />
                   <div>
                     <h4 className="font-bold text-yellow-500 mb-1">ADMINISTRATOR CLEARANCE RECOGNIZED</h4>
                     <p className="text-sm text-yellow-200/80">You have access to raw visitor logs. The system tracks user interactions to analyze engagement.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                      <h4 className={`font-bold mb-2 ${isWizard ? 'text-emerald-300' : 'text-fuchsia-300'}`}>Logged Metrics</h4>
                      <ul className="list-disc pl-5 space-y-2 text-sm opacity-70">
                        <li><strong>Visitor ID:</strong> Unique UUID generated per browser session.</li>
                        <li><strong>Display Name:</strong> Self-reported user identity.</li>
                        <li><strong>Time Spent:</strong> Cumulative session duration in seconds.</li>
                        <li><strong>IP Hash:</strong> SHA-256 hashed IP address (for unique count, privacy preserved).</li>
                        <li><strong>Last Active:</strong> Timestamp of last heartbeat.</li>
                      </ul>
                   </div>
                   <div>
                      <h4 className={`font-bold mb-2 ${isWizard ? 'text-emerald-300' : 'text-fuchsia-300'}`}>Tracking Troubleshooting</h4>
                      <p className="text-sm opacity-70 mb-4">
                        If "User Activity" is not showing in the dashboard, the <code>visitor_logs</code> table may be missing in Supabase.
                      </p>
                      
                      <div className="bg-black p-4 rounded-lg border border-white/10 relative group">
                        <div className="absolute top-2 right-2 text-[10px] uppercase opacity-50 font-bold">SQL Setup</div>
                        <code className="text-xs font-mono text-green-400 block overflow-x-auto">
                          {`create table if not exists visitor_logs (
  visitor_id uuid primary key,
  display_name text,
  total_time_spent int default 0,
  visit_count int default 1,
  last_active timestamptz,
  ip_hash text
);`}
                        </code>
                      </div>
                      <p className="text-[10px] mt-2 opacity-50">Run this query in the Supabase SQL Editor to enable tracking.</p>
                   </div>
                </div>
             </div>
           ) : (
             /* --- USER VIEW (Sanitized) --- */
             <div className="space-y-4">
                <p className={`text-base leading-relaxed opacity-80 ${isWizard ? 'font-wizard' : 'font-muggle'}`}>
                  {isWizard 
                    ? "The Archives are protected by standard secrecy charms. Your presence here is noted by the castle's magic solely to ensure the lights stay on and the staircases move correctly. No personal thoughts or memories are extracted from your mind without consent."
                    : "CoreConnect respects user privacy. We utilize basic telemetry to ensure system uptime and performance optimization. No personally identifiable information (PII) is stored or shared with third parties. Your session data resides locally on your device."}
                </p>
                <div className={`p-4 rounded flex items-center gap-3 ${isWizard ? 'bg-emerald-900/20 text-emerald-300' : 'bg-fuchsia-900/20 text-fuchsia-300'}`}>
                   <ShieldCheckIcon />
                   <span className="font-bold text-sm">Connection is End-to-End Encrypted</span>
                </div>
             </div>
           )}
        </div>
      </div>

    </div>
  );
};

// Helper Icon
const ShieldCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
)

export default SystemInfoView;
