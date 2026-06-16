interface ScoreBoardProps {
  red: number;
  blue: number;
  winTarget?: number;
}

export default function ScoreBoard({ red, blue, winTarget }: ScoreBoardProps) {
  return (
    <div className="pointer-events-none fixed left-4 top-4 z-20 rounded-xl border border-white/15 bg-black/50 px-4 py-2 text-white shadow-lg backdrop-blur">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
        Ty so{winTarget ? ` (thang ${winTarget} diem)` : ""}
      </p>
      <div className="flex items-center gap-3 text-sm font-bold">
        <span className="flex items-center gap-1.5 text-red-400">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          Do {red}
        </span>
        <span className="text-slate-500">-</span>
        <span className="flex items-center gap-1.5 text-blue-400">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
          Xanh {blue}
        </span>
      </div>
    </div>
  );
}
