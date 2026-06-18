import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  loadMatchMusicEnabled,
  loadMenuMusicTrack,
  loadMusicEnabled,
  loadMusicVolume,
  loadSfxVolume,
  saveMatchMusicEnabled,
  saveMenuMusicTrack,
  saveMusicEnabled,
  saveMusicVolume,
  saveSfxVolume
} from "../utils/audioSettings";
import type { MenuMusicTrackId } from "../utils/menuMusicTracks";

interface AudioSettingsContextValue {
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  matchMusicEnabled: boolean;
  menuMusicTrack: MenuMusicTrackId;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setMatchMusicEnabled: (enabled: boolean) => void;
  setMenuMusicTrack: (trackId: MenuMusicTrackId) => void;
}

const AudioSettingsContext = createContext<AudioSettingsContextValue | null>(null);

export function AudioSettingsProvider({ children }: { children: ReactNode }) {
  const [musicVolume, setMusicVolumeState] = useState(loadMusicVolume);
  const [sfxVolume, setSfxVolumeState] = useState(loadSfxVolume);
  const [musicEnabled, setMusicEnabledState] = useState(loadMusicEnabled);
  const [matchMusicEnabled, setMatchMusicEnabledState] = useState(loadMatchMusicEnabled);
  const [menuMusicTrack, setMenuMusicTrackState] = useState(loadMenuMusicTrack);

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

  const setMenuMusicTrack = (trackId: MenuMusicTrackId) => {
    setMenuMusicTrackState(trackId);
    saveMenuMusicTrack(trackId);
  };

  const value = useMemo(
    () => ({
      musicVolume,
      sfxVolume,
      musicEnabled,
      matchMusicEnabled,
      menuMusicTrack,
      setMusicVolume,
      setSfxVolume,
      setMusicEnabled,
      setMatchMusicEnabled,
      setMenuMusicTrack
    }),
    [musicVolume, sfxVolume, musicEnabled, matchMusicEnabled, menuMusicTrack]
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
