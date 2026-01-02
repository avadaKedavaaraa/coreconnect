import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Lineage } from '../types';

interface AmbientAudioProps {
  lineage: Lineage;
  className?: string;
}

const AmbientAudio: React.FC<AmbientAudioProps> = ({ lineage, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Using reliable placeholder audio for demonstration
  // Wizard: Fireplace/Nature sound
  // Muggle: Low Hum/Server room
  const wizardSound = "https://cdn.pixabay.com/download/audio/2022/02/07/audio_249257d079.mp3?filename=fireplace-noise-20999.mp3"; 
  const muggleSound = "https://cdn.pixabay.com/download/audio/2021/08/04/audio_349d97f265.mp3?filename=space-ship-hum-2442.mp3";

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = 0.2;
    }

    const src = lineage === Lineage.WIZARD ? wizardSound : muggleSound;
    
    if (audioRef.current.src !== src) {
      const wasPlaying = !audioRef.current.paused;
      audioRef.current.src = src;
      if (wasPlaying) audioRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
  }, [lineage]);

  const toggle = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <button 
      onClick={toggle}
      className={`p-3 rounded-full transition-all hover:bg-white/10 ${className}
        ${lineage === Lineage.WIZARD 
          ? 'text-emerald-500' 
          : 'text-fuchsia-500'}
      `}
      title={isPlaying ? "Mute Ambient Sound" : "Play Ambient Sound"}
    >
      {isPlaying ? <Volume2 size={24} className={lineage === Lineage.WIZARD ? "animate-pulse" : ""} /> : <VolumeX size={24} />}
    </button>
  );
};

export default AmbientAudio;