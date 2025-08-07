import React, { useState, useEffect, useRef } from 'react';
import { Slider } from '@/components/ui/slider';

interface AudioSliderProps {
  audioId: string;
  className?: string;
}

export function AudioSlider({ audioId, className = '' }: AudioSliderProps) {
  const [value, setValue] = useState([0]);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Find the audio element
    const audio = document.getElementById(audioId) as HTMLAudioElement;
    if (!audio) return;

    audioRef.current = audio;

    const updateProgress = () => {
      if (!isDragging && audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        setValue([progress]);
      }
    };

    const handleLoadedMetadata = () => {
      setValue([0]);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', () => setValue([0]));

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', () => setValue([0]));
    };
  }, [audioId, isDragging]);

  const handleValueChange = (newValue: number[]) => {
    setValue(newValue);
    
    if (audioRef.current && audioRef.current.duration) {
      const newTime = (newValue[0] / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
    }
  };

  const handleValueCommit = (newValue: number[]) => {
    setIsDragging(false);
  };

  const handlePointerDown = () => {
    setIsDragging(true);
  };

  return (
    <Slider
      value={value}
      onValueChange={handleValueChange}
      onValueCommit={handleValueCommit}
      onPointerDown={handlePointerDown}
      max={100}
      step={0.1}
      className={`w-full ${className}`}
    />
  );
}