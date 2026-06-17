import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  loadMatchMusicEnabled,
  loadMusicEnabled,
  loadMusicVolume,
  loadSfxVolume,
  saveMatchMusicEnabled,
  saveMusicEnabled,
  saveMusicVolume,
  saveSfxVolume
} from "../utils/audioSettings";

interface AudioSettingsContextValue {
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  matchMusicEnabled: boolean;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setMatchMusicEnabled: (enabled: boolean) => void;
}

const AudioSettingsContext = createContext<AudioSettingsContextValue | null>(null);

export function AudioSettingsProvider({ children }: { children: ReactNode }) {
  const [musicVolume, setMusicVolumeState] = useState(loadMusicVolume);
  const [sfxVolume, setSfxVolumeState] = useState(loadSfxVolume);
  const [musicEnabled, setMusicEnabledState] = useState(loadMusicEnabled);
  const [matchMusicEnabled, setMatchMusicEnabledState] = useState(loadMatchMusicEnabled);

  const setMusicVolume = (volume: number) => {
    const next = Math.min(1, Math.max(0, volume));
    setMusicVolumeState(next);
    saveMusicVolume(next);
  };

  const setSfxVolume = (volume: number) => {
    const next = Math.min(1, Math.max(0, volume));
    setSfxVolumeState(next);
    saveSfxVolume(next);
  };

  const setMusicEnabled = (enabled: boolean) => {
    setMusicEnabledState(enabled);
    saveMusicEnabled(enabled);
  };

  const setMatchMusicEnabled = (enabled: boolean) => {
    setMatchMusicEnabledState(enabled);
    saveMatchMusicEnabled(enabled);
  };

  const value = useMemo(
    () => ({
      musicVolume,
      sfxVolume,
      musicEnabled,
      matchMusicEnabled,
      setMusicVolume,
      setSfxVolume,
      setMusicEnabled,
      setMatchMusicEnabled
    }),
    [musicVolume, sfxVolume, musicEnabled, matchMusicEnabled]
  );

  return <AudioSettingsContext.Provider value={value}>{children}</AudioSettingsContext.Provider>;
}

export function useAudioSettings() {
  const context = useContext(AudioSettingsContext);
  if (!context) {
    throw new Error("useAudioSettings must be used within AudioSettingsProvider");
  }
  return context;
}
