import React, { useState, useEffect, useRef } from 'react';
import { Lineage, CarouselItem } from '../types';
import { consultTheOracle } from '../services/geminiService';
import { Send, Sparkles, Terminal, X, Minimize2, Maximize2, Loader2, Bot } from 'lucide-react';

interface OracleInterfaceProps {
  lineage: Lineage;
  isOpen: boolean;
  onClose: () => void;
  items: CarouselItem[];
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const OracleInterface: React.FC<OracleInterfaceProps> = ({ lineage, isOpen, onClose, items }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isWizard = lineage === Lineage.WIZARD;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
        // Initial greeting if empty
        if (messages.length === 0) {
            setMessages([{
                id: 'init',
                role: 'model',
                text: isWizard 
                  ? "Approach, seeker. The mists of time part for you. What knowledge do you seek?"
                  : "SYSTEM_READY. CORE.ARCH ONLINE. WAITING FOR INPUT..."
            }]);
        }
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, lineage]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare history for API
    const history = messages.map(m => ({ role: m.role, text: m.text }));
    
    // Prepare Context from Items
    // Providing "whole frontend data" as requested.
    // Increased limit to 1000 items and optimized content string for density.
    // The server is hardened to handle up to 500k characters of context.
    const context = items
        .slice(0, 1000) 
        .map(i => `[ID:${i.id}|SECTOR:${i.sector?.toUpperCase()}|TYPE:${i.type}|TITLE:${i.title}|DATE:${i.date}|CONTENT:${i.content.substring(0, 800).replace(/\n/g, ' ')}]`)
        .join('\n');

    const responseText = await consultTheOracle(lineage, userMsg.text, history, context);
    
    setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
    }]);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  if (isMinimized) {
      return (
          <button 
            onClick={() => setIsMinimized(false)}
            className={`fixed bottom-6 right-6 z-[60] p-4 rounded-full shadow-2xl animate-bounce
               ${isWizard ? 'bg-emerald-900 border border-emerald-500 text-emerald-100' : 'bg-fuchsia-900 border border-fuchsia-500 text-fuchsia-100'}
            `}
          >
              {isWizard ? <Sparkles size={24}/> : <Terminal size={24}/>}
          </button>
      );
  }

  return (
    <div className={`fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-[60] md:w-[450px] md:h-[600px] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 animate-[fade-in-up_0.3s_ease-out]
       ${isWizard 
         ? 'bg-[#0a0f0a]/95 backdrop-blur-xl border border-emerald-600 rounded-xl rounded-br-none' 
         : 'bg-black/95 border border-fuchsia-600 rounded-xl md:rounded-br-none'}
    `}>
        {/* Header */}
        <div className={`p-4 flex justify-between items-center shrink-0 cursor-grab active:cursor-grabbing border-b
           ${isWizard ? 'bg-emerald-950/40 border-emerald-900' : 'bg-fuchsia-950/40 border-fuchsia-900'}
        `}>
            <div className="flex items-center gap-2">
                {isWizard ? <Sparkles size={18} className="text-emerald-400 animate-pulse" /> : <Terminal size={18} className="text-fuchsia-400" />}
                <h3 className={`font-bold ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
                    {isWizard ? 'The Oracle' : 'CORE.ARCH_V2'}
                </h3>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(true)} className={`opacity-70 hover:opacity-100 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}><Minimize2 size={16}/></button>
                <button onClick={onClose} className={`opacity-70 hover:opacity-100 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}><X size={16}/></button>
            </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`} ref={scrollRef}>
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-3 relative
                       ${msg.role === 'user' 
                          ? (isWizard ? 'bg-emerald-900/40 text-emerald-100 border border-emerald-500/30 rounded-tr-none' : 'bg-fuchsia-900/40 text-fuchsia-100 border border-fuchsia-500/30 rounded-tr-none') 
                          : (isWizard ? 'bg-black/40 text-emerald-200 border-l-2 border-emerald-600 rounded-tl-none italic' : 'bg-black/40 text-fuchsia-300 font-mono border-l-2 border-fuchsia-600 rounded-tl-none')}
                    `}>
                        <p className={`text-sm ${isWizard ? 'font-wizard' : 'font-muggle'}`}>{msg.text}</p>
                        {msg.role === 'model' && isWizard && <div className="absolute -left-2 -top-2 text-emerald-600 opacity-50"><Sparkles size={10}/></div>}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className={`p-3 rounded-lg flex items-center gap-2 opacity-50 ${isWizard ? 'bg-black/20 text-emerald-400' : 'bg-black/20 text-fuchsia-400'}`}>
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs">{isWizard ? "Divining..." : "Processing..."}</span>
                    </div>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className={`p-4 border-t ${isWizard ? 'border-emerald-900 bg-emerald-950/20' : 'border-fuchsia-900 bg-fuchsia-950/20'}`}>
            <div className="flex gap-2">
                <input 
                    ref={inputRef}
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={isWizard ? "Ask the spirits..." : "Input command..."}
                    disabled={isLoading}
                    className={`flex-1 bg-transparent outline-none rounded px-3 py-2 border
                       ${isWizard 
                         ? 'border-emerald-800 focus:border-emerald-500 text-emerald-100 placeholder:text-emerald-800 font-wizard' 
                         : 'border-fuchsia-800 focus:border-fuchsia-500 text-fuchsia-100 placeholder:text-fuchsia-800 font-muggle'}
                    `}
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className={`p-2 rounded border transition-all active:scale-95
                    ${isWizard 
                      ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-400 hover:bg-emerald-800' 
                      : 'bg-fuchsia-900/50 border-fuchsia-500/50 text-fuchsia-400 hover:bg-fuchsia-800'}
                  `}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    </div>
  );
};

export default OracleInterface;