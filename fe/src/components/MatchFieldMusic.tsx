import { useEffect, useRef } from "react";
import { Music, VolumeX } from "lucide-react";
import { useAudioSettings } from "../contexts/AudioSettingsContext";

const MATCH_MUSIC_SRC = "/Walen - Champions (freetouse.com).mp3";

interface MatchFieldMusicProps {
  active: boolean;
  showToggle?: boolean;
}

export default function MatchFieldMusic({ active, showToggle = true }: MatchFieldMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { musicVolume, matchMusicEnabled, setMatchMusicEnabled } = useAudioSettings();

  const shouldPlay = active && matchMusicEnabled && musicVolume > 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = musicVolume;

    if (shouldPlay) {
      audio.play().catch(() => {});
      return;
    }

    audio.pause();
  }, [shouldPlay, musicVolume]);

  useEffect(() => {
    if (!active || !matchMusicEnabled || musicVolume <= 0) return;

    const tryPlay = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = musicVolume;
      audio.play().catch(() => {});
    };

    window.addEventListener("pointerdown", tryPlay, { once: true });
    window.addEventListener("keydown", tryPlay, { once: true });
    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
  }, [active, matchMusicEnabled, musicVolume]);

  function handleToggle() {
    const next = !matchMusicEnabled;
    setMatchMusicEnabled(next);
    if (next) {
      window.setTimeout(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = musicVolume;
        audio.play().catch(() => {});
      }, 0);
    }
  }

  return (
    <>
      <audio ref={audioRef} src={MATCH_MUSIC_SRC} loop preload="auto" />
      {active && showToggle && (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={matchMusicEnabled ? "Tắt nhạc sân" : "Bật nhạc sân"}
          title={matchMusicEnabled ? "Tắt nhạc sân" : "Bật nhạc sân"}
          className={`fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-sm transition hover:scale-105 active:scale-100 ${
            matchMusicEnabled
              ? "border-amber-300/50 bg-amber-500/25 text-amber-200 hover:bg-amber-500/35"
              : "border-white/30 bg-black/45 text-slate-300 hover:bg-black/60"
          }`}
        >
          {matchMusicEnabled ? <Music size={22} /> : <VolumeX size={22} />}
        </button>
      )}
    </>
  );
}
