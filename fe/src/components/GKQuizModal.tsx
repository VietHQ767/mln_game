import type { GKDuelPayload } from "../types";

interface GKQuizModalProps {
  data: GKDuelPayload | null;
  answered: boolean;
  onSubmit: (answer: "A" | "B" | "C" | "D") => void;
}

export default function GKQuizModal({ data, answered, onSubmit }: GKQuizModalProps) {
  if (!data) return null;
  const keys: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-[92vw] max-w-2xl rounded-2xl border border-cyan-400/40 bg-slate-900 p-6">
        <h2 className="text-center text-2xl font-bold text-cyan-300">GK Duel</h2>
        <p className="mt-3 text-center text-slate-100">{data.question.text}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {keys.map((k) => (
            <button
              key={k}
              disabled={answered}
              onClick={() => onSubmit(k)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-left text-white disabled:opacity-50"
            >
              {k}. {data.question.options[k]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
