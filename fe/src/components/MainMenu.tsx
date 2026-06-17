import { DoorClosed, ShieldOff, Swords, UserRound } from "lucide-react";

export type GameMode = "6vs6" | "noRule";
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
  kickoffQuizEnabled: boolean;
  noRuleModeEnabled: boolean;
  onPlayerNameChange: (name: string) => void;
  onSelectMode: (mode: GameMode) => void;
  onSelectTeam: (team: TeamChoice) => void;
  onToggleKickoffQuiz: (enabled: boolean) => void;
  onToggleNoRuleMode: (enabled: boolean) => void;
  onJoinFixedRoom: () => void;
  onSpectateRoom: () => void;
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
  kickoffQuizEnabled,
  noRuleModeEnabled,
  onPlayerNameChange,
  onSelectMode,
  onSelectTeam,
  onToggleKickoffQuiz,
  onToggleNoRuleMode,
  onJoinFixedRoom,
  onSpectateRoom,
  onExit
}: MainMenuProps) {
  const showRoomTools = selectedMode === "6vs6" || selectedMode === "noRule";
  const isNoRuleRoom = selectedMode === "noRule";
  const selectedTeamFull = selectedTeam === "RED" ? teamRedFull : teamBlueFull;
  const roomHasPlayers = teamRedCount + teamBlueCount > 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/assets/background_menu.png)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-[94vw] max-w-3xl rounded-2xl border border-sky-400/40 bg-slate-900/95 p-7 shadow-[0_0_35px_rgba(56,189,248,0.25)] backdrop-blur-sm">
        <h1 className="text-center text-3xl font-bold text-slate-100">Main Menu</h1>
        <p className="mb-6 mt-2 text-center text-sm text-slate-300">
          Chọn chế độ chơi phù hợp và bắt đầu trận đấu.
        </p>

        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <UserRound size={16} /> Create Player
        </label>
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
          placeholder="Nhập tên cầu thủ..."
          value={playerName}
          onChange={(e) => onPlayerNameChange(e.target.value)}
        />

        <div className="mt-5 grid gap-3 md:grid-cols-1">
          <button
            type="button"
            onClick={() => onSelectMode("6vs6")}
            className={`rounded-xl border p-4 text-left transition ${
              selectedMode === "6vs6"
                ? "border-amber-300 bg-amber-500/20"
                : "border-slate-700 bg-slate-800/80 hover:border-amber-300/70"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-base font-bold text-white">
              <Swords size={18} /> 6 vs 6
            </div>
            <p className="text-xs text-slate-200">Chế độ đấu đôi tiêu chuẩn cho lớp học (tối đa 6v6).</p>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode("noRule")}
            className={`rounded-xl border p-4 text-left transition ${
              selectedMode === "noRule"
                ? "border-violet-300 bg-violet-500/20"
                : "border-slate-700 bg-slate-800/80 hover:border-violet-300/70"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-base font-bold text-white">
              <ShieldOff size={18} /> No Rule
            </div>
            <p className="text-xs text-slate-200">
              Ghi bàn không cần trả lời câu hỏi — chỉ trả lời khi nạp năng lượng (phím Q).
            </p>
          </button>
        </div>

        {showRoomTools && (
          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-850/70 p-3">
            {!isNoRuleRoom && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Câu hỏi khởi đầu</p>
                  <p className="text-xs text-slate-400">
                    {roomHasPlayers
                      ? "Phòng đã có người — giữ cài đặt hiện tại"
                      : "Tranh quyền giữ bóng trước khi trận đấu"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleKickoffQuiz(!kickoffQuizEnabled)}
                  disabled={roomHasPlayers}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    kickoffQuizEnabled
                      ? "bg-emerald-600/90 text-white"
                      : "bg-slate-700 text-slate-300"
                  } ${roomHasPlayers ? "cursor-not-allowed opacity-60" : "hover:brightness-110"}`}
                >
                  {kickoffQuizEnabled ? "Bật" : "Tắt"}
                </button>
              </div>
            )}

            {isNoRuleRoom && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-violet-500/40 bg-slate-800/80 px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-violet-100">No Rule</p>
                  <p className="text-xs text-slate-400">
                    {roomHasPlayers
                      ? "Phòng đã có người — giữ cài đặt hiện tại"
                      : "Chờ đủ hai đội, tranh bóng bằng Kéo Búa Bao — không điều khiển bóng trước đó"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleNoRuleMode(!noRuleModeEnabled)}
                  disabled={roomHasPlayers}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    noRuleModeEnabled
                      ? "bg-violet-500/90 text-white"
                      : "bg-slate-700 text-slate-300"
                  } ${roomHasPlayers ? "cursor-not-allowed opacity-60" : "hover:brightness-110"}`}
                >
                  {noRuleModeEnabled ? "Bật" : "Tắt"}
                </button>
              </div>
            )}

            <h3 className="mb-2 text-sm font-semibold text-slate-200">Chọn đội</h3>
            <p className="mb-3 text-xs text-slate-300">
              Đội Đỏ: <span className="font-semibold text-red-300">{teamRedCount}</span> / {teamMaxSize}{" "}
              | Đội Xanh: <span className="font-semibold text-blue-300">{teamBlueCount}</span> / {teamMaxSize}
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
                  Đội Đỏ ({teamRedCount}/{teamMaxSize})
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
                  Đội Xanh ({teamBlueCount}/{teamMaxSize})
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
                {selectedTeamFull ? "Đội đã đầy" : "Vào phòng"}
              </button>
              <button
                type="button"
                onClick={onSpectateRoom}
                className="rounded-lg border border-sky-400/50 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25"
              >
                Xem trận đấu
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
