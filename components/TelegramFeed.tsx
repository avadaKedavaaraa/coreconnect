import React, { useEffect, useRef } from 'react';
import { Lineage } from '../types';
import { ExternalLink, Bird, Hash } from 'lucide-react';
import { TELEGRAM_CHANNEL } from '../telegramData';

interface TelegramFeedProps {
  lineage: Lineage;
}

const TelegramFeed: React.FC<TelegramFeedProps> = ({ lineage }) => {
  const isWizard = lineage === Lineage.WIZARD;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const script = document.createElement('script');
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute('data-telegram-post', `${TELEGRAM_CHANNEL}/1`); 
    script.setAttribute('data-width', '100%');
    script.setAttribute('data-telegram-discussion', TELEGRAM_CHANNEL);
    script.setAttribute('data-comments-limit', '20');
    
    if (isWizard) {
      script.setAttribute('data-color', 'E5E7EB'); 
      script.setAttribute('data-dark', '1'); 
      script.setAttribute('data-dark-color', '050A05'); 
    } else {
      script.setAttribute('data-color', 'F0ABFC'); 
      script.setAttribute('data-dark', '1');
      script.setAttribute('data-dark-color', '09050F'); 
    }

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }
  }, [lineage]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-20 flex flex-col gap-6">
      
      <div className={`p-6 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden mt-6
        ${isWizard 
          ? 'bg-[#0f1510] border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' 
          : 'bg-[#150f1a] border-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.1)]'}
      `}>
         <div className={`absolute -right-10 -top-10 opacity-10 rotate-12 ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`}>
            {isWizard ? <Bird size={150} /> : <Hash size={150} />}
         </div>

         <div className="flex items-center gap-4 z-10">
            <div>
                <h2 className={`text-2xl font-bold ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
                    {isWizard ? "The Owlery Feed" : "Live Net-Link"}
                </h2>
                <p className={`text-sm opacity-70 ${isWizard ? 'font-wizard text-emerald-300' : 'font-muggle text-fuchsia-300'}`}>
                    Connected to t.me/{TELEGRAM_CHANNEL}
                </p>
            </div>
         </div>

         <a 
           href={`https://t.me/${TELEGRAM_CHANNEL}`}
           target="_blank"
           rel="noreferrer"
           className={`z-10 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg
             ${isWizard 
               ? 'bg-emerald-600 text-black hover:bg-emerald-500 font-wizardTitle' 
               : 'bg-fuchsia-600 text-black hover:bg-fuchsia-500 font-muggle'}
           `}
         >
            <ExternalLink size={20} />
            {isWizard ? "OPEN TELEGRAM" : "JOIN CHANNEL"}
         </a>
      </div>

      <div className={`flex-1 rounded-xl border overflow-hidden p-4 min-h-[500px] backdrop-blur-sm
        ${isWizard ? 'bg-black/40 border-emerald-900/50' : 'bg-black/40 border-fuchsia-900/50'}
      `}>
          <div className="w-full flex justify-center" ref={containerRef}>
            <p className="opacity-50 mt-10">Summoning feed...</p>
          </div>
      </div>
    </div>
  );
};

export default TelegramFeed;