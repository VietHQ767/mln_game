interface HomePageProps {
  onStart: () => void;
}

export default function HomePage({ onStart }: HomePageProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/assets/HomePage.jpg)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-end px-6 pb-12 sm:pb-16">
        <button
          type="button"
          onClick={onStart}
          className="rounded-full border-2 border-white/80 bg-white/95 px-14 py-4 text-xl font-bold uppercase tracking-widest text-slate-900 shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition hover:scale-105 hover:bg-white hover:shadow-[0_12px_40px_rgba(255,255,255,0.25)] active:scale-100"
        >
          Start
        </button>
      </div>
    </div>
  );
}
