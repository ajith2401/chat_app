"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePresenceStore } from "../store/usePresenceStore";
import { Sparkles, Smile, Heart, Zap, CloudMoon } from "lucide-react";
import api from "../lib/api";

const moods = [
  { id: "neutral", label: "Neutral", icon: Sparkles, color: "text-neutral-400" },
  { id: "romantic", label: "Romantic", icon: Heart, color: "text-rose-400" },
  { id: "happy", label: "Happy", icon: Smile, color: "text-amber-400" },
  { id: "tense", label: "Tense", icon: Zap, color: "text-indigo-400" },
  { id: "missing_you", label: "Missing You", icon: CloudMoon, color: "text-blue-400" },
];

export const MoodSelector = () => {
  const currentVibe = usePresenceStore((s) => s.currentVibe);
  const setCurrentVibe = usePresenceStore((s) => s.setCurrentVibe);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative font-sans">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 shadow-lg"
      >
        <span className="text-[10px] uppercase tracking-widest text-white/40 font-black">Vibe</span>
        <Sparkles className="w-3 h-3 text-amber-400/80 animate-pulse" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute top-full right-0 mt-4 p-2 min-w-[200px] z-[100] backdrop-blur-[100px] bg-black/80 border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="flex flex-col gap-1">
              {moods.map((mood) => (
                <button
                  key={mood.id}
                  onClick={async () => {
                    try {
                      await api.post("/relationships/mood", { mood: mood.id });
                      setCurrentVibe(mood.id);
                      setIsOpen(false);
                    } catch (err) {
                      console.error("Failed to update mood", err);
                    }
                  }}
                  className={`flex items-center gap-4 px-5 py-4 rounded-[1.25rem] hover:bg-white/[0.08] transition-all group ${currentVibe === mood.id ? "bg-white/[0.12] shadow-inner" : ""}`}
                >
                  <mood.icon className={`w-4 h-4 ${mood.color} ${currentVibe === mood.id ? "opacity-100 scale-110" : "opacity-40 group-hover:opacity-100"} transition-all duration-300`} />
                  <span className={`text-xs ${currentVibe === mood.id ? "text-white font-bold" : "text-white/40 group-hover:text-white/90"} transition-colors tracking-wide`}>{mood.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
