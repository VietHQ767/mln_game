import { DoorClosed, Swords, UserRound } from "lucide-react";

type GameMode = "11vs11";
type TeamChoice = "RED" | "BLUE";

interface MainMenuProps {
  playerName: string;
  selectedMode: GameMode | null;
  selectedTeam: TeamChoice;
  teamRedCount: number;
  teamBlueCount: number;
  teamMaxSize: number;
  teamRedFull: boolean;
  teamBlueFull: boolean;
  onPlayerNameChange: (name: string) => void;
  onSelectMode: (mode: GameMode) => void;
  onSelectTeam: (team: TeamChoice) => void;
  // 11vs11: luon vao cung 1 phong duy nhat (khong nhap ma phong).
  onJoinFixedRoom: () => void;
  onExit: () => void;
}

export default function MainMenu({
  playerName,
  selectedMode,
  selectedTeam,
  teamRedCount,
  teamBlueCount,
  teamMaxSize,
  teamRedFull,
  teamBlueFull,
  onPlayerNameChange,
  onSelectMode,
  onSelectTeam,
  onJoinFixedRoom,
  onExit
}: MainMenuProps) {
  const showRoomTools = selectedMode === "11vs11";
  const selectedTeamFull = selectedTeam === "RED" ? teamRedFull : teamBlueFull;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 backdrop-blur-md">
      <div className="w-[94vw] max-w-3xl rounded-2xl border border-sky-400/40 bg-slate-900/95 p-7 shadow-[0_0_35px_rgba(56,189,248,0.25)]">
        <h1 className="text-center text-3xl font-bold text-slate-100">Main Menu</h1>
        <p className="mb-6 mt-2 text-center text-sm text-slate-300">
          Chon che do choi phu hop va bat dau tran dau.
        </p>

        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <UserRound size={16} /> Create Player
        </label>
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
          placeholder="Nhap ten cau thu..."
          value={playerName}
          onChange={(e) => onPlayerNameChange(e.target.value)}
        />

        <div className="mt-5 grid gap-3 md:grid-cols-1">
          <button
            onClick={() => onSelectMode("11vs11")}
            className={`rounded-xl border p-4 text-left transition ${
              selectedMode === "11vs11"
                ? "border-amber-300 bg-amber-500/20"
                : "border-slate-700 bg-slate-800/80 hover:border-amber-300/70"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-base font-bold text-white">
              <Swords size={18} /> 11 vs 11
            </div>
            <p className="text-xs text-slate-200">Che do dau doi tieu chuan cho lop hoc (toi da 11v11).</p>
          </button>
        </div>

        {showRoomTools && (
          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-850/70 p-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Chon doi</h3>
            <p className="mb-3 text-xs text-slate-300">
              Doi Do: <span className="font-semibold text-red-300">{teamRedCount}</span> / {teamMaxSize}{" "}
              | Doi Xanh: <span className="font-semibold text-blue-300">{teamBlueCount}</span> / {teamMaxSize}
            </p>
            <div className="mb-3 grid gap-2 md:grid-cols-2">
              <button
                type="button"
                onClick={() => onSelectTeam("RED")}
                disabled={teamRedFull}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedTeam === "RED"
                    ? "border-red-300 bg-red-500/25 text-white"
                    : "border-slate-600 bg-slate-800 text-slate-100 hover:border-red-300/70"
                } ${teamRedFull ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span className="font-bold text-red-300">
                  Doi Do ({teamRedCount}/{teamMaxSize})
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTeam("BLUE")}
                disabled={teamBlueFull}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedTeam === "BLUE"
                    ? "border-blue-300 bg-blue-500/25 text-white"
                    : "border-slate-600 bg-slate-800 text-slate-100 hover:border-blue-300/70"
                } ${teamBlueFull ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span className="font-bold text-blue-300">
                  Doi Xanh ({teamBlueCount}/{teamMaxSize})
                </span>
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-1">
              <button
                type="button"
                onClick={onJoinFixedRoom}
                disabled={selectedTeamFull}
                className={`rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition ${
                  selectedTeamFull ? "cursor-not-allowed opacity-55" : "hover:brightness-110"
                }`}
              >
                {selectedTeamFull ? "Doi da day" : "Vao phong"}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onExit}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 py-3 font-semibold text-white shadow-[0_0_16px_rgba(244,63,94,0.4)] transition hover:brightness-110"
        >
          <DoorClosed size={18} /> Exit
        </button>
      </div>
    </div>
  );
}
