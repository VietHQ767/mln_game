import { useEffect, useState } from "react";
import { BookOpen, Settings } from "lucide-react";
import { useAudioSettings } from "../contexts/AudioSettingsContext";
import GameHelpContent from "./GameHelpContent";

interface SettingsButtonProps {
  active: boolean;
}

type SettingsView = "closed" | "settings" | "help";

export default function SettingsButton({ active }: SettingsButtonProps) {
  const [view, setView] = useState<SettingsView>("closed");
  const { musicVolume, sfxVolume, musicEnabled, setMusicVolume, setSfxVolume, setMusicEnabled } =
    useAudioSettings();

  useEffect(() => {
    if (view === "closed") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setView((current) => (current === "help" ? "settings" : "closed"));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view]);

  useEffect(() => {
    if (!active) setView("closed");
  }, [active]);

  if (!active) return null;

  const handleBack = () => {
    if (view === "help") {
      setView("settings");
      return;
    }
    setView("closed");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setView("settings")}
        aria-label="Cài đặt"
        className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-black/60 active:scale-100"
      >
        <Settings size={22} />
      </button>

      {view !== "closed" && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-8"
          onClick={handleBack}
        >
          <div
            className={`relative max-h-[85vh] w-full overflow-y-auto rounded-2xl border border-sky-400/35 bg-slate-900/95 p-6 shadow-[0_0_40px_rgba(56,189,248,0.25)] backdrop-blur-md ${
              view === "help" ? "max-w-2xl" : "max-w-md"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            {view === "settings" ? (
              <>
                <h2 className="mb-6 text-center text-2xl font-bold text-white">Cài đặt</h2>

                <div className="mb-5 space-y-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <label htmlFor="music-volume" className="text-sm font-semibold text-slate-200">
                        Nhạc nền
                      </label>
                      <button
                        type="button"
                        onClick={() => setMusicEnabled(!musicEnabled)}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                          musicEnabled
                            ? "bg-emerald-600/80 text-white"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {musicEnabled ? "Bật" : "Tắt"}
                      </button>
                    </div>
                    <input
                      id="music-volume"
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(musicVolume * 100)}
                      onChange={(event) => setMusicVolume(Number(event.target.value) / 100)}
                      className="w-full accent-sky-400"
                    />
                    <p className="mt-2 text-xs text-slate-400">{Math.round(musicVolume * 100)}%</p>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                    <label htmlFor="sfx-volume" className="mb-3 block text-sm font-semibold text-slate-200">
                      Hiệu ứng nút
                    </label>
                    <input
                      id="sfx-volume"
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(sfxVolume * 100)}
                      onChange={(event) => setSfxVolume(Number(event.target.value) / 100)}
                      className="w-full accent-amber-400"
                    />
                    <p className="mt-2 text-xs text-slate-400">{Math.round(sfxVolume * 100)}%</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => setView("help")}
                    className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-slate-800 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    <BookOpen size={18} />
                    Hướng dẫn
                  </button>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Quay lại
                  </button>
                </div>
              </>
            ) : (
              <>
                <GameHelpContent />
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Quay lại
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
