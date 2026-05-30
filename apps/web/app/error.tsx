"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error("Global app error:", error);
  }, [error]);

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-[#050505] text-white gap-8 p-8 text-center">
      <div className="w-16 h-16 rounded-full border border-rose-500/20 flex items-center justify-center">
        <span className="text-2xl text-rose-400/60">✦</span>
      </div>
      <div>
        <h2 className="text-2xl font-serif text-white/80 italic tracking-tight mb-3">Something slipped away.</h2>
        <p className="text-xs uppercase tracking-[0.3em] text-white/30 max-w-xs mx-auto">{error.message || "An unexpected error occurred."}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-2xl border border-white/10 text-xs uppercase tracking-widest font-black hover:bg-white/5 transition-all text-white/60"
        >
          Try Again
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs uppercase tracking-widest font-black hover:bg-white/10 transition-all text-white/60"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
