import { BarChart3, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import type { Player } from "../types";

interface MatchEndOverlayProps {
  active: boolean;
  winnerTeam: "RED" | "BLUE" | null | undefined;
  redScore: number;
  blueScore: number;
  players: Record<string, Player>;
  winTarget?: number;
  myTeam?: "RED" | "BLUE" | null;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export default function MatchEndOverlay({
  active,
  winnerTeam,
  redScore,
  blueScore,
  players,
  winTarget = 15,
  myTeam,
  onPlayAgain,
  onBackToMenu
}: MatchEndOverlayProps) {
  if (!active) return null;
  const [showRanking, setShowRanking] = useState(false);

  const isRedWinner = winnerTeam === "RED";
  const isBlueWinner = winnerTeam === "BLUE";
  const iWon = myTeam && winnerTeam === myTeam;
  const iLost = myTeam && winnerTeam && winnerTeam !== myTeam;
  const winnerTeamKey = winnerTeam ?? "RED";
  const loserTeamKey = winnerTeamKey === "RED" ? "BLUE" : "RED";

  const ranking = useMemo(() => {
    const humans = Object.values(players).filter((player) => !player.isBot);
    const sortByStats = (a: Player, b: Player) => {
      const goalDiff = (b.goals ?? 0) - (a.goals ?? 0);
      if (goalDiff !== 0) return goalDiff;
      const correctDiff = (b.correctAnswers ?? 0) - (a.correctAnswers ?? 0);
      if (correctDiff !== 0) return correctDiff;
      const wrongDiff = (a.wrongAnswers ?? 0) - (b.wrongAnswers ?? 0);
      if (wrongDiff !== 0) return wrongDiff;
      return a.name.localeCompare(b.name);
    };

    return {
      winnerRows: humans.filter((player) => player.team === winnerTeamKey).sort(sortByStats),
      loserRows: humans.filter((player) => player.team === loserTeamKey).sort(sortByStats)
    };
  }, [players, winnerTeamKey, loserTeamKey]);

  const renderStatsTable = (title: string, rows: Player[], tone: "winner" | "loser") => (
    <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/50 p-3">
      <p
        className={`mb-2 text-left text-sm font-semibold ${
          tone === "winner" ? "text-emerald-300" : "text-slate-200"
        }`}
      >
        {title}
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-700">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-700/60 text-slate-200">
            <tr>
              <th className="px-2 py-2 text-left">Cầu thủ</th>
              <th className="px-2 py-2 text-center">Ghi bàn</th>
              <th className="px-2 py-2 text-center">Trả lời đúng</th>
              <th className="px-2 py-2 text-center">Trả lời sai</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 py-3 text-center text-slate-400">
                  Chưa có dữ liệu.
                </td>
              </tr>
            ) : (
              rows.map((player) => (
                <tr key={player.id} className="border-t border-slate-700 text-slate-100">
                  <td className="px-2 py-2 text-left font-medium">{player.name}</td>
                  <td className="px-2 py-2 text-center">{player.goals ?? 0}</td>
                  <td className="px-2 py-2 text-center">{player.correctAnswers ?? 0}</td>
                  <td className="px-2 py-2 text-center">{player.wrongAnswers ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        className={`w-full ${showRanking ? "max-w-4xl" : "max-w-md"} rounded-2xl border-2 bg-slate-900/95 p-8 text-center shadow-2xl ${
          isRedWinner
            ? "border-red-400/60 shadow-red-500/20"
            : isBlueWinner
              ? "border-blue-400/60 shadow-blue-500/20"
              : "border-amber-400/40 shadow-amber-500/20"
        }`}
      >
        <div className="mb-4 flex justify-center">
          <div
            className={`rounded-full p-4 ${
              isRedWinner
                ? "bg-red-500/20 text-red-300"
                : isBlueWinner
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-amber-500/20 text-amber-300"
            }`}
          >
            <Trophy size={40} strokeWidth={1.75} />
          </div>
        </div>

        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Trận đấu kết thúc
        </p>
        <h2
          className={`mb-2 text-2xl font-bold ${
            isRedWinner ? "text-red-300" : isBlueWinner ? "text-blue-300" : "text-amber-300"
          }`}
        >
          {isRedWinner ? "Đội Đỏ thắng!" : isBlueWinner ? "Đội Xanh thắng!" : "Kết thúc trận đấu"}
        </h2>

        {iWon && (
          <p className="mb-3 text-sm font-medium text-emerald-400">Chúc mừng — đội của bạn đã thắng!</p>
        )}
        {iLost && (
          <p className="mb-3 text-sm font-medium text-slate-400">Đội của bạn đã thua. Cố gắng hơn ở trận sau!</p>
        )}

        <div className="mb-4 flex items-center justify-center gap-4">
          <div className="flex flex-col items-center rounded-xl bg-red-500/15 px-5 py-3">
            <span className="text-xs font-semibold uppercase text-red-300">Đỏ</span>
            <span className="text-3xl font-black tabular-nums text-white">{redScore}</span>
          </div>
          <span className="text-lg font-bold text-slate-500">—</span>
          <div className="flex flex-col items-center rounded-xl bg-blue-500/15 px-5 py-3">
            <span className="text-xs font-semibold uppercase text-blue-300">Xanh</span>
            <span className="text-3xl font-black tabular-nums text-white">{blueScore}</span>
          </div>
        </div>

        <p className="mb-6 text-sm text-slate-300">
          Đội đạt <strong className="text-white">{winTarget} điểm</strong> trước sẽ thắng trận.
        </p>

        <button
          type="button"
          onClick={() => setShowRanking((prev) => !prev)}
          className="mb-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
        >
          <BarChart3 size={16} />
          {showRanking ? "Ẩn bảng xếp hạng" : "Bảng xếp hạng"}
        </button>

        {showRanking && (
          <div className="mb-4 text-left">
            {renderStatsTable(
              `Đội thắng (${winnerTeamKey === "RED" ? "Đỏ" : "Xanh"})`,
              ranking.winnerRows,
              "winner"
            )}
            {renderStatsTable(
              `Đội thua (${loserTeamKey === "RED" ? "Đỏ" : "Xanh"})`,
              ranking.loserRows,
              "loser"
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Chơi lại
          </button>
          <button
            type="button"
            onClick={onBackToMenu}
            className="rounded-xl bg-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-600"
          >
            Về menu
          </button>
        </div>
      </div>
    </div>
  );
}
