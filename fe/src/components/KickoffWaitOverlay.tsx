import { useEffect, useState } from "react";

interface KickoffWaitOverlayProps {
  active: boolean;
  resumeAt: number | null | undefined;
  kickoffQuizEnabled: boolean;
}

export default function KickoffWaitOverlay({
  active,
  resumeAt,
  kickoffQuizEnabled
}: KickoffWaitOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    if (!active || !resumeAt) return;

    const update = () => {
      const remaining = Math.max(0, Math.ceil((resumeAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    update();
    const intervalId = window.setInterval(update, 200);
    return () => window.clearInterval(intervalId);
  }, [active, resumeAt]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/55">
      <div className="w-[min(92vw,22rem)] rounded-2xl border border-amber-300/50 bg-slate-900/95 px-6 py-8 text-center shadow-[0_0_40px_rgba(251,191,36,0.25)] backdrop-blur-md">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-amber-300">
          Chuẩn bị vào sân
        </p>
        <p className="mb-4 text-6xl font-black tabular-nums text-white">{secondsLeft}</p>
        <p className="text-sm text-slate-200">
          Vui lòng đợi <strong>{secondsLeft}</strong> giây trước khi trận đấu bắt đầu
        </p>
        <p className="mt-3 text-xs text-slate-400">
          {kickoffQuizEnabled
            ? "Sau đó sẽ có câu hỏi tranh quyền giữ bóng"
            : "Sau đó trận đấu sẽ bắt đầu ngay"}
        </p>
      </div>
    </div>
  );
}
