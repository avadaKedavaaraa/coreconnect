import React, { useState } from 'react';
import { Lineage, type UserProfile } from '../types';
import { GlobalConfig } from '../App';
import { X, Clock, ClipboardList, User } from 'lucide-react';
import Pomodoro from './Pomodoro';
import Kanban from './Kanban';
import StudentID from './StudentID';

interface ToolsModalProps {
  lineage: Lineage;
  onClose: () => void;
  profile: UserProfile;
  config?: GlobalConfig;
}

const ToolsModal: React.FC<ToolsModalProps> = ({ lineage, onClose, profile, config }) => {
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks' | 'id'>('timer');
  const isWizard = lineage === Lineage.WIZARD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fade-in-up_0.2s_ease-out]">
      <div className={`w-full max-w-2xl h-full max-h-[600px] md:h-auto md:max-h-[80vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden relative
         ${isWizard ? 'bg-[#0a0f0a] border-emerald-600' : 'bg-[#0f0a15] border-fuchsia-600'}
      `}>
        {/* Header */}
        <div className={`p-4 border-b flex justify-between items-center ${isWizard ? 'border-emerald-900 bg-emerald-950/20' : 'border-fuchsia-900 bg-fuchsia-950/20'}`}>
           <h3 className={`text-xl font-bold ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
             {isWizard ? 'Scholar\'s Satchel' : 'Developer Tools'}
           </h3>
           <button onClick={onClose} className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}>
             <X size={24} />
           </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isWizard ? 'border-emerald-900' : 'border-fuchsia-900'}`}>
           <button 
             onClick={() => setActiveTab('timer')}
             className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm transition-colors
               ${activeTab === 'timer' 
                 ? (isWizard ? 'bg-emerald-900/30 text-emerald-100' : 'bg-fuchsia-900/30 text-fuchsia-100') 
                 : 'opacity-50 hover:opacity-100'}
               ${isWizard ? 'font-wizard' : 'font-muggle'}
             `}
           >
             <Clock size={16} /> <span className="hidden sm:inline">{isWizard ? 'Brewing Timer' : 'Focus Loop'}</span>
           </button>
           <button 
             onClick={() => setActiveTab('tasks')}
             className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm transition-colors
               ${activeTab === 'tasks' 
                 ? (isWizard ? 'bg-emerald-900/30 text-emerald-100' : 'bg-fuchsia-900/30 text-fuchsia-100') 
                 : 'opacity-50 hover:opacity-100'}
               ${isWizard ? 'font-wizard' : 'font-muggle'}
             `}
           >
             <ClipboardList size={16} /> <span className="hidden sm:inline">{isWizard ? 'Scroll List' : 'Tickets'}</span>
           </button>
           <button 
             onClick={() => setActiveTab('id')}
             className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm transition-colors
               ${activeTab === 'id' 
                 ? (isWizard ? 'bg-emerald-900/30 text-emerald-100' : 'bg-fuchsia-900/30 text-fuchsia-100') 
                 : 'opacity-50 hover:opacity-100'}
               ${isWizard ? 'font-wizard' : 'font-muggle'}
             `}
           >
             <User size={16} /> <span className="hidden sm:inline">{isWizard ? 'Identification' : 'Profile'}</span>
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
           {activeTab === 'timer' && <Pomodoro lineage={lineage} config={config} />}
           {activeTab === 'tasks' && <Kanban lineage={lineage} />}
           {activeTab === 'id' && <StudentID lineage={lineage} profile={profile} />}
        </div>
      </div>
    </div>
  );
};

export default ToolsModal;