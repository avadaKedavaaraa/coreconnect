import React, { useState } from 'react';
import { Lineage, type CarouselItem } from '../types';
import { X, Settings, FileJson, RefreshCw, AlertCircle, Check, Upload } from 'lucide-react';

interface CommandCenterProps {
  lineage: Lineage;
  isOpen: boolean;
  onClose: () => void;
  onImportItems: (items: CarouselItem[]) => void;
}

const CommandCenter: React.FC<CommandCenterProps> = ({ lineage, isOpen, onClose, onImportItems }) => {
  const [jsonContent, setJsonContent] = useState('');
  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info', msg: string} | null>(null);

  const isWizard = lineage === Lineage.WIZARD;

  const handleJsonImport = () => {
    try {
        const data = JSON.parse(jsonContent);
        if (!data.messages || !Array.isArray(data.messages)) {
            throw new Error("Invalid JSON format. Expected 'messages' array.");
        }

        const newItems: CarouselItem[] = data.messages.map((msg: any) => {
            if (msg.type !== 'message') return null;

            // Handle Telegram's text array/string format
            const textContent = Array.isArray(msg.text) 
                ? msg.text.map((t: any) => typeof t === 'string' ? t : t.text).join(' ') 
                : (msg.text || '');

            return {
                id: `tg-json-${msg.id}`,
                title: data.name || 'Imported Message',
                date: msg.date ? new Date(msg.date).toLocaleDateString() : 'Unknown Date',
                content: textContent || 'Attached Media',
                type: msg.photo ? 'file' : 'announcement',
                subject: 'Archive',
                author: msg.from || 'Anonymous',
                isUnread: false,
                likes: 0
            };
        }).filter(Boolean);

        onImportItems(newItems);
        setStatus({ type: 'success', msg: `Successfully imported ${newItems.length} messages.` });

    } catch (err: any) {
        setStatus({ type: 'error', msg: 'JSON Parse Error: ' + err.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fade-in_0.2s_ease-out]">
        <div className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]
            ${isWizard ? 'bg-[#0a0f0a] border-emerald-600' : 'bg-[#0f0a15] border-fuchsia-600'}
        `}>
            {/* Header */}
            <div className={`p-4 border-b flex justify-between items-center ${isWizard ? 'border-emerald-900 bg-emerald-950/20' : 'border-fuchsia-900 bg-fuchsia-950/20'}`}>
                <div className="flex items-center gap-3">
                    <Settings className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} />
                    <h3 className={`text-xl font-bold ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
                        Command Center
                    </h3>
                </div>
                <button onClick={onClose} className={isWizard ? 'text-emerald-500 hover:text-emerald-300' : 'text-fuchsia-500 hover:text-fuchsia-300'}>
                    <X size={24} />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
                
                {status && (
                    <div className={`mb-6 p-3 rounded border flex items-start gap-3 text-sm
                        ${status.type === 'error' ? 'border-red-500/50 bg-red-900/20 text-red-200' : 
                          status.type === 'success' ? 'border-green-500/50 bg-green-900/20 text-green-200' : 
                          'border-blue-500/50 bg-blue-900/20 text-blue-200'}
                    `}>
                        {status.type === 'error' ? <AlertCircle size={16} className="mt-0.5" /> : 
                         status.type === 'success' ? <Check size={16} className="mt-0.5" /> : 
                         <RefreshCw size={16} className="mt-0.5 animate-spin" />}
                        <div>{status.msg}</div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <FileJson className={isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} />
                        <h4 className={`font-bold ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>Data Import</h4>
                    </div>

                    <p className={`text-sm opacity-70 ${isWizard ? 'font-wizard' : 'font-muggle'}`}>
                        Paste JSON data below to import announcements or messages from external archives.
                        Expected format: <code>{`{ "messages": [...] }`}</code>
                    </p>

                    <textarea 
                        value={jsonContent}
                        onChange={(e) => setJsonContent(e.target.value)}
                        placeholder='Paste JSON content here...'
                        className={`w-full h-48 p-3 rounded border bg-transparent outline-none text-xs font-mono resize-none
                            ${isWizard ? 'border-emerald-800 focus:border-emerald-500 text-emerald-100' : 'border-fuchsia-800 focus:border-fuchsia-500 text-fuchsia-100'}
                        `}
                    />

                    <button 
                        onClick={handleJsonImport}
                        className={`w-full py-3 rounded font-bold transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2
                            ${isWizard ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-black'}
                        `}
                    >
                        <Upload size={18} /> IMPORT DATA
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CommandCenter;