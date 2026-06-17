import { useEffect, useState } from "react";
import type { RpsChoice, RpsDuelPayload } from "../types";

interface RpsDuelModalProps {
  duelData: RpsDuelPayload | null;
  myId: string | null;
  submitted: boolean;
  onSubmitChoice: (choice: RpsChoice) => void;
}

const CHOICES: { id: RpsChoice; label: string; emoji: string }[] = [
  { id: "rock", label: "Búa", emoji: "✊" },
  { id: "scissors", label: "Kéo", emoji: "✌️" },
  { id: "paper", label: "Bao", emoji: "✋" }
];

export default function RpsDuelModal({
  duelData,
  myId,
  submitted,
  onSubmitChoice
}: RpsDuelModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    if (!duelData) return;

    const update = () => {
      const remaining = Math.max(0, Math.ceil((duelData.deadlineAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    update();
    const intervalId = window.setInterval(update, 200);
    return () => window.clearInterval(intervalId);
  }, [duelData]);

  if (!duelData || !myId || !duelData.players.includes(myId)) return null;

  const isKickoff = duelData.kind === "kickoff";

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75">
      <div className="w-[92vw] max-w-lg rounded-2xl border border-violet-400/40 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-1 text-center text-2xl font-bold text-violet-300">
          {isKickoff ? "Tranh quyền giữ bóng" : "Tranh chấp bóng"}
        </h2>
        <p className="mb-1 text-center text-sm text-slate-300">Kéo Búa Bao</p>
        <p className="mb-4 text-center text-xs text-slate-400">
          Kéo thắng Bao · Búa thắng Kéo · Bao thắng Búa · Hòa thì chọn lại
        </p>

        <p className="mb-4 text-center text-3xl font-black tabular-nums text-amber-300">
          {secondsLeft}s
        </p>

        <div className="grid grid-cols-3 gap-3">
          {CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={submitted}
              onClick={() => onSubmitChoice(choice.id)}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-4 text-white transition hover:border-violet-400 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-3xl">{choice.emoji}</span>
              <span className="text-sm font-semibold">{choice.label}</span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-sm text-slate-300">
          {submitted
            ? "Đang chờ đối thủ..."
            : `Vòng ${duelData.round} — chọn thẻ trong ${secondsLeft} giây. Không chọn thì đối thủ giữ bóng.`}
        </p>
      </div>
    </div>
  );
}
