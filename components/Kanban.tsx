
import React, { useState, useEffect } from 'react';
import { Lineage, type Task } from '../types';
import { Plus, Trash2, CheckCircle } from 'lucide-react';

interface KanbanProps {
  lineage: Lineage;
}

const Kanban: React.FC<KanbanProps> = ({ lineage }) => {
  const isWizard = lineage === Lineage.WIZARD;
  
  // Initialize with empty array or defaults, will load from LocalStorage in useEffect
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('core_connect_kanban');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) { console.error("Failed to parse tasks"); }
    } else {
      // Default tasks: Empty for clean slate
      setTasks([]);
    }
    setLoaded(true);
  }, [isWizard]);

  // Save to LocalStorage whenever tasks change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('core_connect_kanban', JSON.stringify(tasks));
    }
  }, [tasks, loaded]);

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now().toString(), title: newTask, status: 'todo' }]);
    setNewTask('');
  };

  const moveTask = (id: string, newStatus: Task['status']) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const columns: { id: Task['status'], label: string }[] = [
    { id: 'todo', label: isWizard ? 'To Brew' : 'Backlog' },
    { id: 'doing', label: isWizard ? 'Stirring' : 'In Progress' },
    { id: 'done', label: isWizard ? 'Bottled' : 'Deployed' },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      {/* Input */}
      <div className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder={isWizard ? "New task for the scroll..." : "Add ticket..."}
          className={`flex-1 bg-transparent border rounded px-3 py-2 outline-none
            ${isWizard 
              ? 'border-emerald-700 text-emerald-100 placeholder:text-emerald-800 font-wizard' 
              : 'border-fuchsia-700 text-fuchsia-100 placeholder:text-fuchsia-800 font-muggle text-xs'}
          `}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
        />
        <button onClick={addTask} className={`p-2 rounded border ${isWizard ? 'text-emerald-400 border-emerald-500' : 'text-fuchsia-400 border-fuchsia-500'}`}>
          <Plus size={20} />
        </button>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-2 flex-1">
        {columns.map(col => (
          <div key={col.id} className={`flex-1 min-w-[200px] rounded-lg p-3 border backdrop-blur-sm flex flex-col gap-3
            ${isWizard ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-fuchsia-950/20 border-fuchsia-900/50'}
          `}>
             <h4 className={`text-sm font-bold uppercase tracking-wider opacity-70 border-b pb-2 mb-1 ${isWizard ? 'border-emerald-800 text-emerald-300 font-wizard' : 'border-fuchsia-800 text-fuchsia-300 font-muggle'}`}>
               {col.label}
             </h4>
             
             {tasks.filter(t => t.status === col.id).map(task => (
               <div key={task.id} className={`p-3 rounded border shadow-sm relative group transition-all hover:scale-[1.02]
                 ${isWizard ? 'bg-black/60 border-emerald-800 text-emerald-100' : 'bg-black/60 border-fuchsia-800 text-fuchsia-100'}
               `}>
                 <p className={`text-sm ${isWizard ? 'font-wizard' : 'font-muggle'}`}>{task.title}</p>
                 
                 <div className="flex justify-between items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                    <div className="flex gap-1">
                      {col.id !== 'todo' && (
                         <button onClick={() => moveTask(task.id, col.id === 'done' ? 'doing' : 'todo')} className="text-xs opacity-50 hover:opacity-100">&lt;</button>
                      )}
                      {col.id !== 'done' && (
                         <button onClick={() => moveTask(task.id, col.id === 'todo' ? 'doing' : 'done')} className="text-xs opacity-50 hover:opacity-100">&gt;</button>
                      )}
                    </div>
                 </div>
               </div>
             ))}
             {tasks.filter(t => t.status === col.id).length === 0 && (
                <div className="opacity-20 text-center text-xs py-4 italic">Empty</div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Kanban;
