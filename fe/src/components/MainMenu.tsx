import { DoorClosed, Dumbbell, List, Swords, UserRound, Zap } from "lucide-react";
import type { Room } from "../types";

type GameMode = "1vsBot" | "11vs11" | "Practice";

interface MainMenuProps {
  playerName: string;
  selectedMode: GameMode | null;
  roomCode: string;
  practiceTeammates: number;
  practiceOpponents: number;
  rooms: Room[];
  showRoomList: boolean;
  onPlayerNameChange: (name: string) => void;
  onSelectMode: (mode: GameMode) => void;
  onRoomCodeChange: (value: string) => void;
  onPracticeTeammatesChange: (value: number) => void;
  onPracticeOpponentsChange: (value: number) => void;
  onCreatePracticeRoom: () => void;
  onCreateModeRoom: () => void;
  onJoinByCode: () => void;
  onToggleRoomList: () => void;
  onJoinRoom: (roomId: string) => void;
  onExit: () => void;
}

export default function MainMenu({
  playerName,
  selectedMode,
  roomCode,
  practiceTeammates,
  practiceOpponents,
  rooms,
  showRoomList,
  onPlayerNameChange,
  onSelectMode,
  onRoomCodeChange,
  onPracticeTeammatesChange,
  onPracticeOpponentsChange,
  onCreatePracticeRoom,
  onCreateModeRoom,
  onJoinByCode,
  onToggleRoomList,
  onJoinRoom,
  onExit
}: MainMenuProps) {
  const showRoomTools = selectedMode === "11vs11";
  const showPracticeTools = selectedMode === "Practice";

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
            {/* Che do 11vs11 su dung ma phong hoac danh sach phong de vao dung tran dau */}
            <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                placeholder="Nhap ma phong de tham gia..."
                value={roomCode}
                onChange={(e) => onRoomCodeChange(e.target.value)}
              />
              <button
                onClick={onCreateModeRoom}
                className="rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Tao phong
              </button>
              <button
                onClick={onJoinByCode}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Vao phong
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Danh sach phong</h3>
              <button
                onClick={onToggleRoomList}
                className="flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-100"
              >
                <List size={14} /> {showRoomList ? "An danh sach" : "Mo danh sach"}
              </button>
            </div>

            {showRoomList && (
              <div className="mt-2 grid gap-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => onJoinRoom(room.id)}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-sky-400"
                  >
                    {room.name} - {room.players}/{room.capacity}
                  </button>
                ))}
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
