import { useEffect, useRef } from "react";
import { useAudioSettings } from "../contexts/AudioSettingsContext";

const GAME_OVER_SRC = "/game_over.mp3";

interface MatchEndMusicProps {
  active: boolean;
}

export default function MatchEndMusic({ active }: MatchEndMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const wasActiveRef = useRef(false);
  const { musicVolume, matchMusicEnabled } = useAudioSettings();

  const shouldPlay = active && matchMusicEnabled && musicVolume > 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = musicVolume;

    if (shouldPlay) {
      if (!wasActiveRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      wasActiveRef.current = true;
      return;
    }

    if (wasActiveRef.current) {
      audio.pause();
      audio.currentTime = 0;
    }
    wasActiveRef.current = false;
  }, [shouldPlay, musicVolume]);

  useEffect(() => {
    if (!shouldPlay) return;

    const tryPlay = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = musicVolume;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    window.addEventListener("pointerdown", tryPlay, { once: true });
    window.addEventListener("keydown", tryPlay, { once: true });
    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
  }, [shouldPlay, musicVolume]);

  return <audio ref={audioRef} src={GAME_OVER_SRC} preload="auto" />;
}
