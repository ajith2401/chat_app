"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePresenceStore } from "../store/usePresenceStore";
import { Sparkles, Smile, Heart, Zap, Moon, Coffee, Gamepad2 } from "lucide-react";
import api from "../lib/api";

const moods = [
  { id: "neutral",     label: "Neutral",      icon: Sparkles, color: "text-neutral-400",  bg: "bg-neutral-500/10" },
  { id: "romantic",    label: "Romantic",     icon: Heart,    color: "text-rose-400",     bg: "bg-rose-500/10" },
  { id: "happy",       label: "Happy",        icon: Smile,    color: "text-amber-400",    bg: "bg-amber-500/10" },
  { id: "tense",       label: "Tense",        icon: Zap,      color: "text-indigo-400",   bg: "bg-indigo-500/10" },
  { id: "missing_you", label: "Missing You",  icon: Moon,     color: "text-blue-400",     bg: "bg-blue-500/10" },
  { id: "supportive",  label: "Supportive",   icon: Coffee,   color: "text-emerald-400",  bg: "bg-emerald-500/10" },
  { id: "playful",     label: "Playful",      icon: Gamepad2, color: "text-violet-400",   bg: "bg-violet-500/10" },
];

export const MoodSelector = () => {
  const currentVibe = usePresenceStore((s) => s.currentVibe);
  const setCurrentVibe = usePresenceStore((s) => s.setCurrentVibe);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeMood = moods.find((m) => m.id === currentVibe) || moods[0];
  const ActiveIcon = activeMood.icon;

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative font-sans">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border transition-all active:scale-95 shadow-lg ${
          isOpen
            ? "bg-white/10 border-white/20"
            : "bg-white/5 border-white/10 hover:bg-white/10"
        }`}
      >
        <span className="text-[10px] uppercase tracking-widest text-white/40 font-black hidden sm:block">Vibe</span>
        <ActiveIcon className={`w-3.5 h-3.5 ${activeMood.color}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Invisible backdrop to catch outside clicks on mobile */}
            <div className="fixed inset-0 z-[199]" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute top-full right-0 mt-3 p-2 w-52 z-[200] backdrop-blur-[80px] bg-neutral-950/90 border border-white/10 rounded-[1.75rem] shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
            >
              <p className="text-[9px] uppercase tracking-[0.25em] text-white/20 font-black px-4 pt-2 pb-1">Set the mood</p>
              <div className="flex flex-col gap-0.5">
                {moods.map((mood) => {
                  const Icon = mood.icon;
                  const active = currentVibe === mood.id;
                  return (
                    <button
                      key={mood.id}
                      disabled={saving}
                      onClick={async () => {
                        // Optimistic — update local vibe immediately for instant feedback
                        setCurrentVibe(mood.id);
                        setIsOpen(false);
                        setSaving(true);
                        try {
                          await api.post("/relationships/mood", { mood: mood.id });
                        } catch {
                          // Revert on failure
                          setCurrentVibe(currentVibe);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-[1.1rem] transition-all group w-full ${
                        active ? `${mood.bg} text-white` : "hover:bg-white/[0.06] text-white/50 hover:text-white/90"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${active ? mood.bg : "bg-white/5"} flex-shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${mood.color}`} />
                      </div>
                      <span className="text-[12px] font-medium tracking-wide">{mood.label}</span>
                      {active && <div className={`ml-auto w-1.5 h-1.5 rounded-full ${mood.color.replace("text-", "bg-")}`} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
