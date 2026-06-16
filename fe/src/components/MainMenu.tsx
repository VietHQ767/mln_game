import { useEffect, useState } from "react";
import { DoorClosed, Dumbbell, Swords, UserRound, Zap } from "lucide-react";
import type { Room } from "../types";

type GameMode = "1vsBot" | "11vs11" | "Practice";
type TeamChoice = "RED" | "BLUE";

interface MainMenuProps {
  playerName: string;
  selectedMode: GameMode | null;
  selectedTeam: TeamChoice;
  // Chi dung cho luong "Tao phong": nguoi dung nhap ma phong va bam Create.
  roomCode: string;
  practiceTeammates: number;
  practiceOpponents: number;
  onPlayerNameChange: (name: string) => void;
  onSelectMode: (mode: GameMode) => void;
  onSelectTeam: (team: TeamChoice) => void;
  onRoomCodeChange: (value: string) => void;
  onPracticeTeammatesChange: (value: number) => void;
  onPracticeOpponentsChange: (value: number) => void;
  onCreatePracticeRoom: () => void;
  onCreateModeRoom: () => void;
  // 11vs11: vao phong tu dong, khong nhap ma phong.
  onJoinAnyRoom: () => void;
  // Danh sach phong da tao (chi hien sau khi nhan Create).
  showCreatedRoomsList: boolean;
  createdRooms: Room[];
  onJoinCreatedRoom: (roomId: string) => void;
  onExit: () => void;
}

export default function MainMenu({
  playerName,
  selectedMode,
  selectedTeam,
  roomCode,
  practiceTeammates,
  practiceOpponents,
  onPlayerNameChange,
  onSelectMode,
  onSelectTeam,
  onRoomCodeChange,
  onPracticeTeammatesChange,
  onPracticeOpponentsChange,
  onCreatePracticeRoom,
  onCreateModeRoom,
  onJoinAnyRoom,
  showCreatedRoomsList,
  createdRooms,
  onJoinCreatedRoom,
  onExit
}: MainMenuProps) {
  const showRoomTools = selectedMode === "11vs11";
  const showPracticeTools = selectedMode === "Practice";
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  useEffect(() => {
    if (!showRoomTools) setShowCreatePanel(false);
  }, [showRoomTools]);

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

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <button
            onClick={() => onSelectMode("1vsBot")}
            className={`rounded-xl border p-4 text-left transition ${
              selectedMode === "1vsBot"
                ? "border-emerald-300 bg-emerald-500/20"
                : "border-slate-700 bg-slate-800/80 hover:border-emerald-300/70"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-base font-bold text-white">
              <Zap size={18} /> 1 vs May
            </div>
            <p className="text-xs text-slate-200">1 nguoi choi doi dau 11 cau thu BOT ben doi Xanh.</p>
          </button>
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
          <button
            onClick={() => onSelectMode("Practice")}
            className={`rounded-xl border p-4 text-left transition ${
              selectedMode === "Practice"
                ? "border-cyan-300 bg-cyan-500/20"
                : "border-slate-700 bg-slate-800/80 hover:border-cyan-300/70"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-base font-bold text-white">
              <Dumbbell size={18} /> Practice
            </div>
            <p className="text-xs text-slate-200">Tu cau hinh so bot dong doi va doi thu de luyen tap.</p>
          </button>
        </div>

        {showRoomTools && (
          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-850/70 p-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Chon doi</h3>
            <div className="mb-3 grid gap-2 md:grid-cols-2">
              <button
                type="button"
                onClick={() => onSelectTeam("RED")}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedTeam === "RED"
                    ? "border-red-300 bg-red-500/25 text-white"
                    : "border-slate-600 bg-slate-800 text-slate-100 hover:border-red-300/70"
                }`}
              >
                <span className="font-bold text-red-300">Doi Do</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTeam("BLUE")}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedTeam === "BLUE"
                    ? "border-blue-300 bg-blue-500/25 text-white"
                    : "border-slate-600 bg-slate-800 text-slate-100 hover:border-blue-300/70"
                }`}
              >
                <span className="font-bold text-blue-300">Doi Xanh</span>
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowCreatePanel(true)}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_18px_rgba(251,191,36,0.25)] transition hover:brightness-110"
              >
                Tao phong
              </button>
              <button
                type="button"
                onClick={onJoinAnyRoom}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Vao phong
              </button>
            </div>

            {showCreatePanel && (
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                  placeholder="Nhap ma phong de tao..."
                  value={roomCode}
                  onChange={(e) => onRoomCodeChange(e.target.value)}
                />
                <button
                  onClick={onCreateModeRoom}
                  className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Create
                </button>
              </div>
            )}

            {showCreatedRoomsList && createdRooms.length > 0 && (
              <div className="mt-3">
                <h3 className="mb-2 text-sm font-semibold text-slate-200">Phong da tao</h3>
                <div className="grid gap-2">
                  {createdRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => onJoinCreatedRoom(room.id)}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-sky-400"
                    >
                      <div className="font-medium">{room.name}</div>
                      <div className="mt-1 text-xs text-slate-300">
                        {room.players}/{room.capacity} nguoi | Do: {room.redCount ?? 0}/11 | Xanh:{" "}
                        {room.blueCount ?? 0}/11
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showPracticeTools && (
          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-850/70 p-3">
            {/* Form cau hinh nhanh cho phong luyen tap */}
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Cau hinh san tap</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="text-xs text-slate-300">
                So dong doi BOT (0-10)
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={practiceTeammates}
                  onChange={(e) => onPracticeTeammatesChange(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
              </label>
              <label className="text-xs text-slate-300">
                So doi thu BOT (1-11)
                <input
                  type="number"
                  min={1}
                  max={11}
                  value={practiceOpponents}
                  onChange={(e) => onPracticeOpponentsChange(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
              </label>
            </div>
            <button
              onClick={onCreatePracticeRoom}
              className="mt-3 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Vao san tap
            </button>
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
