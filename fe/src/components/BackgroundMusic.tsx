import { useEffect, useRef } from "react";
import { useAudioSettings } from "../contexts/AudioSettingsContext";
import { getMenuMusicTrackSrc } from "../utils/menuMusicTracks";

interface BackgroundMusicProps {
  active: boolean;
}

export default function BackgroundMusic({ active }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { musicVolume, musicEnabled, menuMusicTrack } = useAudioSettings();
  const musicSrc = getMenuMusicTrackSrc(menuMusicTrack);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = musicVolume;

    if (active && musicEnabled && musicVolume > 0) {
      audio.play().catch(() => {});
      return;
    }

    audio.pause();
  }, [active, musicEnabled, musicVolume, musicSrc]);

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
  }, [active, musicEnabled, musicVolume, musicSrc]);

  return <audio key={musicSrc} ref={audioRef} src={musicSrc} loop preload="auto" />;
}
