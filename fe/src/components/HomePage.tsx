import { DoorClosed, List, PlusCircle, UserRound } from "lucide-react";
import type { Room } from "../types";

interface HomePageProps {
  playerName: string;
  rooms: Room[];
  showRoomList: boolean;
  onPlayerNameChange: (name: string) => void;
  onCreateRoom: () => void;
  onToggleRoomList: () => void;
  onJoinRoom: (roomId: string) => void;
  onExit: () => void;
}

export default function HomePage({
  playerName,
  rooms,
  showRoomList,
  onPlayerNameChange,
  onCreateRoom,
  onToggleRoomList,
  onJoinRoom,
  onExit
}: HomePageProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
      {/* Nen bong da phong cach hero: gradient + vach san */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.22),transparent_50%),linear-gradient(180deg,#061225_0%,#020617_100%)]" />
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-[40px] border border-emerald-300/20" />
      <div className="absolute left-1/2 top-1/2 h-[2px] w-[760px] -translate-x-1/2 -translate-y-1/2 bg-emerald-300/20" />
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/30" />

      <div className="relative z-10 w-[92vw] max-w-xl rounded-3xl border border-sky-400/35 bg-slate-900/85 p-7 shadow-[0_0_40px_rgba(56,189,248,0.3)] backdrop-blur-md">
        <h1 className="text-center text-4xl font-extrabold tracking-wide text-white">Football Classroom</h1>
        <p className="mb-6 mt-2 text-center text-sm text-slate-200">
          Trang chu: tao cau thu, chon phong va bat dau tran dau.
        </p>

        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <UserRound size={16} /> Create Player
        </label>
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
          placeholder="Nhap ten cau thu..."
          value={playerName}
          onChange={(event) => onPlayerNameChange(event.target.value)}
        />

        <div className="mt-5 grid gap-3">
          <button
            onClick={onCreateRoom}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 font-semibold text-white shadow-[0_0_16px_rgba(56,189,248,0.45)] transition hover:brightness-110"
          >
            <PlusCircle size={18} /> Create Room
          </button>
          <button
            onClick={onToggleRoomList}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 py-3 font-semibold text-white shadow-[0_0_16px_rgba(139,92,246,0.4)] transition hover:brightness-110"
          >
            <List size={18} /> Room List
          </button>
          <button
            onClick={onExit}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 py-3 font-semibold text-white shadow-[0_0_16px_rgba(244,63,94,0.4)] transition hover:brightness-110"
          >
            <DoorClosed size={18} /> Exit
          </button>
        </div>

        {showRoomList && (
          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/55 p-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Danh sach phong</h3>
            <div className="grid gap-2">
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
          </div>
        )}
      </div>
    </div>
  );
}
