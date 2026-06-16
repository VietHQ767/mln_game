import { useMemo, useState } from "react";

interface EnergyChargerProps {
  open: boolean;
  onClose: () => void;
  onRecharge: () => void;
}

const energyQuestions = [
  { q: "5 + 7 = ?", options: ["10", "12", "13", "14"], answer: "12" },
  { q: "Thủ đô Việt Nam?", options: ["Huế", "Hà Nội", "Đà Nẵng", "Nha Trang"], answer: "Hà Nội" },
  { q: "JavaScript chạy trên?", options: ["Server only", "Browser", "Arduino", "BIOS"], answer: "Browser" }
];

export default function EnergyCharger({ open, onClose, onRecharge }: EnergyChargerProps) {
  const [lockedUntil, setLockedUntil] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const current = useMemo(() => energyQuestions[questionIdx], [questionIdx]);
  const now = Date.now();
  const isLocked = now < lockedUntil;

  if (!open) return null;

  const submit = (choice: string) => {
    if (isLocked) return;

    if (choice === current.answer) {
      onRecharge();
      setQuestionIdx((prev) => (prev + 1) % energyQuestions.length);
      return;
    }

    // Trả lời sai: khóa 5 giây.
    setLockedUntil(Date.now() + 5000);
  };

  return (
    <div className="fixed left-1/2 top-4 z-30 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-yellow-300/35 bg-slate-900/90 p-3 text-white shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-yellow-300">Nạp năng lượng</h4>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1.5 py-0.5 text-xs text-slate-300 transition hover:bg-slate-700 hover:text-white"
          aria-label="Đóng"
        >
          Q
        </button>
      </div>
      <p className="mb-2 text-xs">{current.q}</p>
      <div className="grid grid-cols-2 gap-2">
        {current.options.map((opt) => (
          <button
            key={opt}
            onClick={() => submit(opt)}
            disabled={isLocked}
            className="rounded-md bg-slate-700 px-2 py-1 text-xs transition hover:bg-yellow-500/40 disabled:opacity-50"
          >
            {opt}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-300">
        {isLocked ? "Sai - chờ 5 giây để thử lại." : "Trả lời đúng để +30 energy. Bấm Q để đóng."}
      </p>
    </div>
  );
}
