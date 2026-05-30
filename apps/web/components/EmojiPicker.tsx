"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

// Categorized emoji set — WhatsApp/Instagram style
const EMOJI_CATEGORIES = [
  {
    label: "❤️ Relationship",
    emojis: ["❤️","🩷","💕","💞","💓","💗","💖","💘","💝","💟","🫀","❣️","💌","💍","💎","👫","💑","🫶","🤝","🥂","🌹","🌸","🌺","🌷","💐"],
  },
  {
    label: "😊 Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","🫠","😉","😊","😇","🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🫡","🤭","🤫","🤔","🫣","🤐","🤨","😐","😑","😶","😶‍🌫️","😏","😒","🙄","😬","🤥","🫨","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","😵‍💫","🤯","🤠","🥳","🥸","😎","🤓","🧐"],
  },
  {
    label: "🥺 Feelings",
    emojis: ["🥺","😢","😭","😤","😠","😡","🤬","😳","🥱","😩","😫","😞","☹️","🙁","😟","😕","🫤","😣","😖","😨","😰","😱","😓","😥","😓","🤗","🫂","😈","👿","💀","☠️","🤡","👹","👻","👽","🤖"],
  },
  {
    label: "👋 Gestures",
    emojis: ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","🫵","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🫶","🙌","👐","🤲","🙏","✍️","💅","🤳","💪","🦾"],
  },
  {
    label: "🎉 Celebration",
    emojis: ["🎉","🎊","🎈","🎁","🎀","🥳","🎂","🍰","🧁","🍾","🥂","🍻","🥰","✨","🌟","⭐","💫","🌠","🎆","🎇","🪄","🎭","🎨","🎪","🎠","🏆","🥇","🎯"],
  },
  {
    label: "🌙 Nature",
    emojis: ["🌙","🌛","🌜","🌚","🌝","⭐","🌟","💫","✨","☄️","🌈","☀️","🌤️","⛅","🌦️","🌧️","⛈️","🌩️","❄️","🌊","🌸","🌺","🌻","🌹","🌷","🍀","🌿","🌱","🌲","🌴","🦋","🐝","🕊️","🐬","🦄","🌙","🪐"],
  },
  {
    label: "😋 Food",
    emojis: ["🍕","🍔","🍟","🌮","🌯","🥗","🍜","🍱","🍣","🍩","🍪","🎂","🍰","☕","🧋","🍵","🥤","🧃","🍷","🥂","🍾","🍫","🍬","🍭","🍿","🍦","🧇","🥞","🧆"],
  },
  {
    label: "💬 Symbols",
    emojis: ["💯","🔥","⚡","💥","❓","❗","💤","💢","💬","💭","👁️","🫧","✅","❌","🚫","⚠️","🆘","📌","🎵","🎶","🔔","📱","💻","📸","📷","🎬","🎮","🎲","📖"],
  },
];

export const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const activeCategory = useRef(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="absolute bottom-full left-0 mb-3 w-[340px] sm:w-[380px] z-[300] rounded-[1.5rem] bg-neutral-950/95 backdrop-blur-[80px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden"
    >
      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide px-3 pt-3 pb-2 border-b border-white/5">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={i}
            onClick={() => {
              document.getElementById(`emoji-cat-${i}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            className="text-base px-1.5 py-1 rounded-lg hover:bg-white/10 transition-all flex-shrink-0 active:scale-90"
            title={cat.label}
          >
            {cat.emojis[0]}
          </button>
        ))}
      </div>

      {/* Emoji grid — scrollable */}
      <div className="overflow-y-auto max-h-[260px] scrollbar-hide px-3 py-2">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <div key={i} id={`emoji-cat-${i}`}>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-black py-2 pl-1">{cat.label}</p>
            <div className="grid grid-cols-8 gap-0.5 mb-2">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="text-xl p-1.5 rounded-xl hover:bg-white/10 transition-all active:scale-90 hover:scale-110 duration-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
