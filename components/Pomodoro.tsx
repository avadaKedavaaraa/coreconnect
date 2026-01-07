

import React, { useState, useEffect, useRef } from 'react';
import { Lineage, GlobalConfig } from '../types';
import { Play, Pause, RotateCcw, FlaskConical, Cpu, Timer, Check, Bell, BellOff, Volume2 } from 'lucide-react';

interface PomodoroProps {
  lineage: Lineage;
  config?: GlobalConfig;
}

const Pomodoro: React.FC<PomodoroProps> = ({ lineage, config }) => {
  const isWizard = lineage === Lineage.WIZARD;
  
  // Audio Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // State
  const [totalDuration, setTotalDuration] = useState(25 * 60); 
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false); // New state for alarm ringing

  // Custom Input State
  const [customH, setCustomH] = useState('');
  const [customM, setCustomM] = useState('');
  const [customS, setCustomS] = useState('');

  // Sounds - Use Config if available, else fallback
  const wizardAlarm = config?.wizardAlarmUrl || "https://actions.google.com/sounds/v1/cartoon/harp_strum.ogg";
  const muggleAlarm = config?.muggleAlarmUrl || "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg";

  // Initialize Audio
  useEffect(() => {
    // Re-initialize audio when lineage or config changes
    const src = isWizard ? wizardAlarm : muggleAlarm;
    
    // Cleanup previous
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }

    // New Audio
    audioRef.current = new Audio(src);
    audioRef.current.loop = true; 
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [lineage, config]); // Add config to dep array so it updates when Admin changes it

  // Handle Ringing State
  useEffect(() => {
    if (isRinging && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Audio playback failed:", error);
        });
      }
    } else if (!isRinging && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isRinging]);

  // Timer Logic
  useEffect(() => {
    let interval: number | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            // Timer Finished
            setIsActive(false);
            setIsRinging(true); // Trigger Alarm
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } 

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  // Warm Up Audio on User Interaction
  const warmUpAudio = () => {
    if (audioRef.current && !isActive && timeLeft > 0) {
        // Mute, play, pause, unmute
        const originalVolume = audioRef.current.volume;
        audioRef.current.volume = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                audioRef.current?.pause();
                audioRef.current!.volume = originalVolume;
                audioRef.current!.currentTime = 0;
            }).catch(e => console.log("Audio warm-up prevented:", e));
        }
    }
  };

  const toggleTimer = () => {
    if (!isActive) warmUpAudio();
    setIsActive(!isActive);
  };

  // Helpers
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const setTimer = (seconds: number) => {
    setTotalDuration(seconds);
    setTimeLeft(seconds);
    setIsActive(false);
    setIsRinging(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(customH) || 0;
    const m = parseInt(customM) || 0;
    const s = parseInt(customS) || 0;
    
    const totalSecs = (h * 3600) + (m * 60) + s;
    
    if (totalSecs > 0) {
        setTimer(totalSecs);
        setCustomH('');
        setCustomM('');
        setCustomS('');
    }
  };

  const stopAlarm = () => {
    setIsRinging(false);
  };

  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;

  // Presets Configuration
  const presets = isWizard 
    ? [
        { label: 'Quick Stir', secs: 5 * 60 },
        { label: 'Standard', secs: 25 * 60 },
        { label: 'Potion', secs: 45 * 60 }
      ]
    : [
        { label: 'Short', secs: 5 * 60 },
        { label: 'Pomodoro', secs: 25 * 60 },
        { label: 'Deep Work', secs: 60 * 60 }
      ];

  return (
    <div className="flex flex-col items-center gap-6 p-2 w-full">
      
      {/* --- Main Timer Display --- */}
      <div className={`relative w-64 h-64 rounded-full flex items-center justify-center border-4 transition-all duration-500
        ${isRinging 
            ? (isWizard ? 'border-red-500 bg-red-900/20 shadow-[0_0_50px_rgba(239,68,68,0.5)] animate-pulse' : 'border-red-500 bg-red-900/20 shadow-[0_0_50px_rgba(239,68,68,0.5)] animate-pulse')
            : (isWizard ? 'border-emerald-900/30 bg-black/40' : 'border-fuchsia-900/30 bg-black/40')
        }
      `}>
        
        {/* Progress Circle Visual */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
           {/* Track */}
           <circle cx="50" cy="50" r="46" fill="none" strokeWidth="2" 
             className={isWizard ? 'stroke-emerald-900/10' : 'stroke-fuchsia-900/10'} />
           
           {/* Progress Indicator */}
           <circle cx="50" cy="50" r="46" fill="none" strokeWidth="2" 
             strokeDasharray="289" 
             strokeDashoffset={289 - (289 * progress) / 100}
             strokeLinecap="round"
             className={`transition-all duration-1000 ${isRinging ? 'opacity-0' : 'opacity-100'} ${isWizard ? 'stroke-emerald-500' : 'stroke-fuchsia-500'}`} />
        </svg>

        <div className="flex flex-col items-center z-10 relative">
          {isRinging ? (
            <div className="flex flex-col items-center animate-bounce">
                <Bell size={64} className="text-red-500 mb-2" />
                <button 
                  onClick={stopAlarm}
                  className="bg-red-600 text-white font-bold px-6 py-2 rounded-full hover:bg-red-500 transition-colors shadow-lg animate-pulse"
                >
                  STOP ALARM
                </button>
            </div>
          ) : (
              <>
                {isWizard ? <FlaskConical size={24} className="mb-4 opacity-50 text-emerald-300" /> : <Cpu size={24} className="mb-4 opacity-50 text-fuchsia-300" />}
                <div className={`text-6xl font-bold font-mono tracking-tighter ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>
                    {formatTime(timeLeft)}
                </div>
                <div className={`text-[10px] uppercase tracking-widest opacity-60 mt-4 ${isWizard ? 'font-wizard' : 'font-muggle'}`}>
                    {isActive ? (isWizard ? 'Brewing in Progress...' : 'Processing Task...') : (isWizard ? 'Cauldron Idle' : 'System Standby')}
                </div>
              </>
          )}
        </div>
      </div>

      {/* --- Controls --- */}
      <div className="flex gap-4">
        {!isRinging && (
          <>
            <button 
              onClick={toggleTimer}
              className={`p-4 rounded-full border transition-all hover:scale-110 active:scale-95 shadow-lg
                ${isWizard 
                  ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/50' 
                  : 'bg-fuchsia-900/30 border-fuchsia-500/50 text-fuchsia-400 hover:bg-fuchsia-900/50'}
              `}
            >
              {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
            </button>
            <button 
              onClick={() => { setTimer(totalDuration); }}
              className={`p-4 rounded-full border transition-all hover:scale-110 active:scale-95
                ${isWizard 
                  ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/50' 
                  : 'bg-fuchsia-900/30 border-fuchsia-500/50 text-fuchsia-400 hover:bg-fuchsia-900/50'}
              `}
            >
              <RotateCcw size={28} />
            </button>
          </>
        )}
      </div>

      <div className={`w-full h-px opacity-20 my-2 ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>

      {/* --- Customization --- */}
      <div className="w-full space-y-6">
          
          {/* Presets */}
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => (
                <button
                    key={p.label}
                    onClick={() => setTimer(p.secs)}
                    className={`py-2 px-1 rounded text-xs font-bold border transition-all
                        ${totalDuration === p.secs 
                            ? (isWizard ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-fuchsia-500 text-black border-fuchsia-400')
                            : (isWizard ? 'bg-transparent text-emerald-300 border-emerald-900/50 hover:bg-emerald-900/30' : 'bg-transparent text-fuchsia-300 border-fuchsia-900/50 hover:bg-fuchsia-900/30')
                        }
                    `}
                >
                    {p.label}
                </button>
            ))}
          </div>

          {/* Advanced Custom Input */}
          <div className="space-y-2">
            <div className={`text-[10px] uppercase font-bold opacity-70 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}>
              Custom Duration
            </div>
            <form onSubmit={handleCustomSubmit} className="flex gap-2 items-center">
              {/* Hours */}
              <div className="flex-1 relative">
                 <input 
                   type="number" min="0" max="23" placeholder="00"
                   value={customH} onChange={e => setCustomH(e.target.value)}
                   className={`w-full p-2 text-center rounded border bg-transparent outline-none
                     ${isWizard ? 'border-emerald-800 text-emerald-100 focus:border-emerald-500' : 'border-fuchsia-800 text-fuchsia-100 focus:border-fuchsia-500'}
                   `}
                 />
                 <span className="absolute -bottom-4 left-0 right-0 text-[9px] text-center opacity-50">HR</span>
              </div>
              <span className="opacity-50">:</span>
              
              {/* Minutes */}
              <div className="flex-1 relative">
                 <input 
                   type="number" min="0" max="59" placeholder="00"
                   value={customM} onChange={e => setCustomM(e.target.value)}
                   className={`w-full p-2 text-center rounded border bg-transparent outline-none
                     ${isWizard ? 'border-emerald-800 text-emerald-100 focus:border-emerald-500' : 'border-fuchsia-800 text-fuchsia-100 focus:border-fuchsia-500'}
                   `}
                 />
                 <span className="absolute -bottom-4 left-0 right-0 text-[9px] text-center opacity-50">MIN</span>
              </div>
              <span className="opacity-50">:</span>

              {/* Seconds */}
              <div className="flex-1 relative">
                 <input 
                   type="number" min="0" max="59" placeholder="00"
                   value={customS} onChange={e => setCustomS(e.target.value)}
                   className={`w-full p-2 text-center rounded border bg-transparent outline-none
                     ${isWizard ? 'border-emerald-800 text-emerald-100 focus:border-emerald-500' : 'border-fuchsia-800 text-fuchsia-100 focus:border-fuchsia-500'}
                   `}
                 />
                 <span className="absolute -bottom-4 left-0 right-0 text-[9px] text-center opacity-50">SEC</span>
              </div>

              <button 
                  type="submit"
                  className={`ml-2 px-3 py-2 rounded font-bold text-xs uppercase transition-colors hover:brightness-125
                      ${isWizard ? 'bg-emerald-900 text-emerald-400' : 'bg-fuchsia-900 text-fuchsia-400'}
                  `}
              >
                  SET
              </button>
            </form>
          </div>
      </div>
    </div>
  );
};

export default Pomodoro;