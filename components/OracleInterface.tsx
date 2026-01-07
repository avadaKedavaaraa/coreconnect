
import React, { useState, useEffect, useRef } from 'react';
import { Lineage, CarouselItem, UserProfile } from '../types';
import { consultTheOracle } from '../services/geminiService';
import { Send, Sparkles, Terminal, X, Minimize2, Maximize2, Loader2, Bot } from 'lucide-react';
import DOMPurify from 'dompurify';
import { API_URL } from '../App';

interface OracleInterfaceProps {
  lineage: Lineage;
  isOpen: boolean;
  onClose: () => void;
  items: CarouselItem[];
  profile?: UserProfile; // Added prop
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const OracleInterface: React.FC<OracleInterfaceProps> = ({ lineage, isOpen, onClose, items, profile }) => {
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

  // Override service call to include visitorId
  const sendToOracle = async (query: string, history: any[], context: string) => {
      try {
        const res = await fetch(`${API_URL}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            lineage,
            history,
            context,
            visitorId: profile?.id || 'anonymous' // Pass ID
          })
        });
        const data = await res.json();
        return data.text;
      } catch(e) { return "Connection severed."; }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role, text: m.text }));
    
    // Prepare Context
    const context = items
        .slice(0, 1000) 
        .map(i => `[ID:${i.id}|SECTOR:${i.sector?.toUpperCase()}|TYPE:${i.type}|TITLE:${i.title}|DATE:${i.date}|CONTENT:${i.content.substring(0, 800).replace(/\n/g, ' ')}]`)
        .join('\n');

    const responseText = await sendToOracle(userMsg.text, history, context);
    
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
        <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`} ref={scrollRef}>
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fade-in_0.3s]`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 relative backdrop-blur-md shadow-lg border
                       ${msg.role === 'user' 
                          ? (isWizard 
                              ? 'bg-emerald-900/60 border-emerald-500/50 text-emerald-50 rounded-tr-none' 
                              : 'bg-fuchsia-900/60 border-fuchsia-500/50 text-fuchsia-50 rounded-tr-none') 
                          : (isWizard 
                              ? 'bg-black/80 border-emerald-800 text-emerald-100 rounded-tl-none' 
                              : 'bg-black/80 border-fuchsia-800 text-fuchsia-100 rounded-tl-none')}
                    `}>
                        <div 
                            className="text-sm font-sans leading-relaxed whitespace-pre-wrap oracle-content"
                            dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(msg.text.replace(/\n/g, '<br>'), {
                                    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'br', 'p', 'ul', 'li', 'code', 'pre', 'u']
                                }) 
                            }}
                        ></div>
                        {msg.role === 'model' && isWizard && <div className="absolute -left-2 -top-2 text-emerald-500 opacity-80 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]"><Sparkles size={14}/></div>}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className={`p-4 rounded-xl flex items-center gap-2 border bg-black/60 backdrop-blur-sm ${isWizard ? 'border-emerald-900/50 text-emerald-400' : 'border-fuchsia-900/50 text-fuchsia-400'}`}>
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs tracking-widest uppercase">{isWizard ? "Consulting Archives..." : "Processing Query..."}</span>
                    </div>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className={`p-4 border-t ${isWizard ? 'border-emerald-900 bg-emerald-950/20' : 'border-fuchsia-950/20'}`}>
            <div className="flex gap-2">
                <input 
                    ref={inputRef}
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={isWizard ? "Ask the spirits..." : "Input command..."}
                    disabled={isLoading}
                    className={`flex-1 bg-black/50 outline-none rounded-lg px-4 py-3 border transition-all
                       ${isWizard 
                         ? 'border-emerald-800 focus:border-emerald-500 text-emerald-100 placeholder:text-emerald-800 font-wizard' 
                         : 'border-fuchsia-800 focus:border-fuchsia-500 text-fuchsia-100 placeholder:text-fuchsia-800 font-muggle'}
                    `}
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className={`p-3 rounded-lg border transition-all active:scale-95 shadow-lg
                    ${isWizard 
                      ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-400 hover:bg-emerald-800 hover:text-white' 
                      : 'bg-fuchsia-900/80 border-fuchsia-500/50 text-fuchsia-400 hover:bg-fuchsia-800 hover:text-white'}
                  `}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
            .oracle-content b, .oracle-content strong { 
                color: ${isWizard ? '#34d399' : '#e879f9'}; 
                text-shadow: 0 0 10px ${isWizard ? 'rgba(52, 211, 153, 0.5)' : 'rgba(232, 121, 249, 0.5)'};
                font-weight: 800;
            }
            .oracle-content i, .oracle-content em {
                color: ${isWizard ? '#a7f3d0' : '#f0abfc'};
                font-style: italic;
            }
            .oracle-content u { 
                text-decoration: underline; 
                text-decoration-color: ${isWizard ? '#059669' : '#c026d3'}; 
                text-underline-offset: 4px; 
            }
            .oracle-content ul { padding-left: 1.5rem; list-style-type: disc; margin: 0.5rem 0; }
            .oracle-content li { margin-bottom: 0.25rem; }
        `}} />
    </div>
  );
};

export default OracleInterface;
