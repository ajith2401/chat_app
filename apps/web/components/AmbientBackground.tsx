"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePresenceStore } from "../store/usePresenceStore";

// All gradients MUST use dark color stops (≥800 series) at ≤30% opacity to guarantee
// WCAG AA contrast (4.5:1) for text-white/90 on top. Never use 100–400 stops here.
const MOOD_GRADIENTS: Record<string, string> = {
  neutral:      "from-neutral-950 via-neutral-900 to-neutral-950",
  romantic:     "from-rose-900/30 via-neutral-950 to-neutral-950",
  happy:        "from-amber-900/20 via-neutral-950 to-neutral-950",
  tense:        "from-indigo-900/30 via-neutral-950 to-neutral-950",
  missing_you:  "from-blue-900/30 via-neutral-950 to-neutral-950",
  supportive:   "from-emerald-900/20 via-neutral-950 to-neutral-950",
  playful:      "from-violet-900/25 via-neutral-950 to-neutral-950",
};

const getSafeGradient = (mood: string): string =>
  MOOD_GRADIENTS[mood] ?? MOOD_GRADIENTS.neutral;

export const AmbientBackground = () => {
  const currentVibe = usePresenceStore((s) => s.currentVibe);
  const intensity = usePresenceStore((s) => (s as any).currentIntensity ?? 0.5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const gradient = getSafeGradient(currentVibe);
  // Intensity modulates opacity: 0.1 (calm) → 0.3 (intense) — stays within WCAG bounds
  const gradientOpacity = 0.1 + (Math.min(Math.max(intensity, 0), 1) * 0.2);

  return (
    <div className="fixed inset-0 -z-10 bg-neutral-950 overflow-hidden">
      <AnimatePresence mode="wait">
        {mounted && (
          <motion.div
            key={currentVibe}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: gradientOpacity, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 2.5, ease: [0.4, 0, 0.2, 1] }}
            className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
            style={{ opacity: gradientOpacity }}
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/noise.svg')]" />
    </div>
  );
};
