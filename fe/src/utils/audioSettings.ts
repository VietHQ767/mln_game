import {
  DEFAULT_MENU_MUSIC_TRACK,
  type MenuMusicTrackId,
  MENU_MUSIC_TRACKS
} from "./menuMusicTracks";

export const MUSIC_VOLUME_KEY = "musicVolume";
export const SFX_VOLUME_KEY = "sfxVolume";
export const MUSIC_ENABLED_KEY = "musicEnabled";
export const MATCH_MUSIC_ENABLED_KEY = "matchMusicEnabled";
export const MENU_MUSIC_TRACK_KEY = "menuMusicTrack";

export const DEFAULT_MUSIC_VOLUME = 0.4;
export const DEFAULT_SFX_VOLUME = 0.15;

function readNumber(key: string, fallback: number) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function readBoolean(key: string, fallback: boolean) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw !== "false";
}

export function loadMusicVolume() {
  return readNumber(MUSIC_VOLUME_KEY, DEFAULT_MUSIC_VOLUME);
}

export function loadSfxVolume() {
  return readNumber(SFX_VOLUME_KEY, DEFAULT_SFX_VOLUME);
}

export function loadMusicEnabled() {
  return readBoolean(MUSIC_ENABLED_KEY, true);
}

export function loadMatchMusicEnabled() {
  return readBoolean(MATCH_MUSIC_ENABLED_KEY, true);
}

export function loadMenuMusicTrack(): MenuMusicTrackId {
  const raw = localStorage.getItem(MENU_MUSIC_TRACK_KEY);
  if (raw && MENU_MUSIC_TRACKS.some((track) => track.id === raw)) {
    return raw as MenuMusicTrackId;
  }
  return DEFAULT_MENU_MUSIC_TRACK;
}

export function saveMusicVolume(volume: number) {
  localStorage.setItem(MUSIC_VOLUME_KEY, String(volume));
}

export function saveSfxVolume(volume: number) {
  localStorage.setItem(SFX_VOLUME_KEY, String(volume));
}

export function saveMusicEnabled(enabled: boolean) {
  localStorage.setItem(MUSIC_ENABLED_KEY, String(enabled));
}

export function saveMatchMusicEnabled(enabled: boolean) {
  localStorage.setItem(MATCH_MUSIC_ENABLED_KEY, String(enabled));
}

export function saveMenuMusicTrack(trackId: MenuMusicTrackId) {
  localStorage.setItem(MENU_MUSIC_TRACK_KEY, trackId);
}
