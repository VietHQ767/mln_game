import { useEffect, useRef } from "react";
import { useAudioSettings } from "../contexts/AudioSettingsContext";

const MUSIC_SRC = "/music_start.mp3";

interface BackgroundMusicProps {
  active: boolean;
}

export default function BackgroundMusic({ active }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { musicVolume, musicEnabled } = useAudioSettings();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = musicVolume;

    if (active && musicEnabled && musicVolume > 0) {
      audio.play().catch(() => {});
      return;
    }

    audio.pause();
  }, [active, musicEnabled, musicVolume]);

  useEffect(() => {
    if (!active || !musicEnabled || musicVolume <= 0) return;

    const tryPlay = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = musicVolume;
      audio.play().catch(() => {});
    };

    window.addEventListener("pointerdown", tryPlay, { once: true });
    return () => window.removeEventListener("pointerdown", tryPlay);
  }, [active, musicEnabled, musicVolume]);

  return <audio ref={audioRef} src={MUSIC_SRC} loop preload="auto" />;
}
