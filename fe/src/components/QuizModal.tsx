import type { DuelPayload } from "../types";

interface QuizModalProps {
  duelData: DuelPayload | null;
  answered: boolean;
  onSubmitAnswer: (answer: "A" | "B" | "C" | "D") => void;
}

export default function QuizModal({ duelData, answered, onSubmitAnswer }: QuizModalProps) {
  if (!duelData) return null;

  const answers: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75">
      <div className="w-[92vw] max-w-2xl rounded-2xl border border-slate-600 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-2 text-center text-2xl font-bold text-amber-300">Tranh chap bong</h2>
        <p className="mb-5 text-center text-slate-100">{duelData.question.text}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {answers.map((key) => (
            <button
              key={key}
              disabled={answered}
              onClick={() => onSubmitAnswer(key)}
              className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-3 text-left font-semibold text-white transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {key}. {duelData.question.options[key]}
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-sm text-slate-300">
          {answered
            ? "Da gui dap an, dang cho doi thu..."
            : "Tra loi nhanh va dung de giu bong. Sai/cham se bi dung yen 3 giay."}
        </p>
      </div>
    </div>
  );
}
