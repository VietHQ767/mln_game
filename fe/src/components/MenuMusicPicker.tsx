import { useEffect, useState } from "react";
import { Music } from "lucide-react";
import { useAudioSettings } from "../contexts/AudioSettingsContext";
import {
  getMenuMusicTrackLabel,
  MENU_MUSIC_TRACKS,
  type MenuMusicTrackId
} from "../utils/menuMusicTracks";

interface MenuMusicPickerProps {
  active: boolean;
}

export default function MenuMusicPicker({ active }: MenuMusicPickerProps) {
  const [open, setOpen] = useState(false);
  const { menuMusicTrack, setMenuMusicTrack } = useAudioSettings();

  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!active) return null;

  const handleSelect = (trackId: MenuMusicTrackId) => {
    setMenuMusicTrack(trackId);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Chọn nhạc nền"
        title={`Nhạc: ${getMenuMusicTrackLabel(menuMusicTrack)}`}
        className="fixed right-4 top-[4.25rem] z-50 flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/45 bg-amber-500/20 text-amber-100 shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-amber-500/30 active:scale-100"
      >
        <Music size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)}>
          <div
            className="fixed right-4 top-[7.5rem] z-[56] w-[min(92vw,16rem)] rounded-xl border border-amber-300/35 bg-slate-900/95 p-3 shadow-[0_0_24px_rgba(251,191,36,0.2)] backdrop-blur-md"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-amber-200/90">
              Chọn nhạc nền
            </p>
            <div className="grid gap-2">
              {MENU_MUSIC_TRACKS.map((track) => {
                const selected = menuMusicTrack === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleSelect(track.id)}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition ${
                      selected
                        ? "border-amber-300 bg-amber-500/25 text-amber-50"
                        : "border-slate-600 bg-slate-800/90 text-slate-100 hover:border-amber-300/60"
                    }`}
                  >
                    {track.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
