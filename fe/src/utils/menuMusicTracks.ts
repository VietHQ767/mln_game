export const MENU_MUSIC_TRACKS = [
  { id: "default", label: "Nhạc mặc định", src: "/music_start.mp3" },
  { id: "rise", label: "RISE", src: "/RISE.mp3" }
] as const;

export type MenuMusicTrackId = (typeof MENU_MUSIC_TRACKS)[number]["id"];

export const DEFAULT_MENU_MUSIC_TRACK: MenuMusicTrackId = "default";

export function getMenuMusicTrackSrc(trackId: MenuMusicTrackId) {
  return MENU_MUSIC_TRACKS.find((track) => track.id === trackId)?.src ?? MENU_MUSIC_TRACKS[0].src;
}

export function getMenuMusicTrackLabel(trackId: MenuMusicTrackId) {
  return MENU_MUSIC_TRACKS.find((track) => track.id === trackId)?.label ?? MENU_MUSIC_TRACKS[0].label;
}
