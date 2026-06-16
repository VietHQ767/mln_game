import type { DuelPayload } from "../types";

interface QuizModalProps {
  duelData: DuelPayload | null;
  answered: boolean;
  onSubmitAnswer: (answer: "A" | "B" | "C" | "D") => void;
}

export default function QuizModal({ duelData, answered, onSubmitAnswer }: QuizModalProps) {
  if (!duelData) return null;

  const answers: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

  const isKickoff = duelData.kind === "kickoff";
  const isGoal = duelData.kind === "goal";

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75">
      <div className="w-[92vw] max-w-2xl rounded-2xl border border-slate-600 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-2 text-center text-2xl font-bold text-amber-300">
          {isGoal ? "Xác nhận ghi bàn" : isKickoff ? "Bắt đầu trận đấu" : "Tranh chấp bóng"}
        </h2>
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
            ? "Đang xác nhận kết quả..."
            : isGoal
              ? "Trả lời đúng để ghi bàn. Sai sẽ mất bàn và đối thủ phát bóng lên."
              : isKickoff
                ? "Trả lời nhanh và đúng để đội của bạn giữ bóng."
                : "Trả lời nhanh và đúng để giữ bóng. Sai/chậm sẽ bị đứng yên 3 giây."}
        </p>
      </div>
    </div>
  );
}
