"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Check, CheckCheck, Reply as ReplyIcon, AlertCircle, RotateCcw } from "lucide-react";
import { decryptIncoming, decryptImageBlob } from "../lib/crypto-client";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatBubbleProps {
  message: any;
  isOwn: boolean;
  onReply?: (message: any) => void;
  onRetry?: (message: any) => void;
  onVisible?: () => void;
}

// Detect messages that are purely 1–3 emoji characters for large rendering
const isEmojiOnly = (text: string) => {
  const t = text.trim();
  if (!t || t.length > 12) return false;
  // Check if every code point is in emoji/symbol ranges (no letters/digits)
  return Array.from(t).every((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    return (
      (cp >= 0x1F000 && cp <= 0x1FFFF) ||
      (cp >= 0x2600 && cp <= 0x27BF) ||
      (cp >= 0xFE00 && cp <= 0xFEFF) ||
      cp === 0x200D || cp === 0x20E3 ||
      (cp >= 0x1F3FB && cp <= 0x1F3FF)
    );
  });
};

export const ChatBubble = ({ message, isOwn, onReply, onRetry, onVisible }: ChatBubbleProps) => {
  const { status, createdAt, type, mediaUrl, replyTo, failed, isOptimistic } = message;
  const timestamp = new Date(createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Decrypt text under CK (legacy/plaintext passes through). Optimistic messages
  // carry plaintext content with no envelope, so this is a no-op for them.
  const content = type === "image" ? message.content : decryptIncoming(message);
  const replyPreview = replyTo ? decryptIncoming(replyTo) : "";
  const emojiOnly = type === "text" && isEmojiOnly(content || "");
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Encrypted images: fetch ciphertext, decrypt to an in-memory blob URL.
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  useEffect(() => {
    if (type !== "image" || !mediaUrl) return;
    if (!message.mediaKey) {
      // Legacy unencrypted image (public_id or full URL).
      setImgSrc(
        mediaUrl.startsWith("http")
          ? mediaUrl
          : `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/q_auto,f_auto/${mediaUrl}`
      );
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(mediaUrl);
        const buf = new Uint8Array(await res.arrayBuffer());
        const plain = decryptImageBlob(buf, message.mediaKey);
        objectUrl = URL.createObjectURL(new Blob([plain as BlobPart]));
        if (!cancelled) setImgSrc(objectUrl);
      } catch {
        if (!cancelled) setImgSrc(null);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [type, mediaUrl, message.mediaKey]);

  useEffect(() => {
    if (isOwn || !onVisible || !bubbleRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { onVisible(); observer.disconnect(); } },
      { threshold: 0.6 }
    );
    observer.observe(bubbleRef.current);
    return () => observer.disconnect(); // cleanup on unmount
  }, [isOwn, onVisible]);

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, scale: 0.95, y: 10, x: isOwn ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "max-w-[85%] sm:max-w-[75%] flex flex-col gap-1 mb-2 group",
        isOwn ? "items-end self-end ml-auto" : "items-start self-start mr-auto",
        isOptimistic && !failed && "opacity-60",
        failed && "opacity-90"
      )}
    >
      <div className={cn("flex items-center gap-2 w-full", isOwn ? "flex-row-reverse" : "flex-row")}>
        <div
          className={cn(
            "rounded-[1.25rem] text-[13px] leading-relaxed relative overflow-hidden transition-all duration-300",
            emojiOnly
              ? "bg-transparent border-none shadow-none px-1 py-0.5"
              : isOwn
                ? "bg-white/10 text-white rounded-tr-none border border-white/5 shadow-lg px-5 py-3.5"
                : "bg-neutral-900/40 text-neutral-200 rounded-tl-none border border-white/5 shadow-md backdrop-blur-sm px-5 py-3.5",
            type === "image" && !emojiOnly ? "!p-1.5" : "",
            failed && "border-rose-500/40 bg-rose-950/20"
          )}
        >
          {/* Reply Reference */}
          {replyTo && (
            <div className={cn(
              "mb-3 p-3 rounded-xl bg-white/5 border-l-2 border-white/20 text-xs opacity-60 italic max-w-full overflow-hidden truncate",
              isOwn ? "text-right" : "text-left"
            )}>
              <p className="line-clamp-1">{replyPreview}</p>
            </div>
          )}

          {/* Image Content */}
          {type === "image" && mediaUrl ? (
            <div className="flex flex-col gap-2">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt="Shared moment"
                  className="rounded-xl max-h-[300px] w-full object-cover shadow-inner"
                />
              ) : (
                <div className="rounded-xl h-40 w-56 bg-white/5 flex items-center justify-center text-[10px] uppercase tracking-widest text-white/30">
                  Decrypting…
                </div>
              )}
            </div>
          ) : emojiOnly ? (
            <p className="text-4xl leading-tight select-none">{content}</p>
          ) : (
            <p className="font-light tracking-wide whitespace-pre-wrap break-words">{content}</p>
          )}
          
          {/* Subtle glass reflection effect */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none">
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/[0.03] rotate-45 transform" />
          </div>
        </div>

        {/* Quick Reply Button */}
        <button 
          onClick={() => onReply?.(message)}
          className="p-2 rounded-full hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white/60"
        >
          <ReplyIcon className="w-4 h-4" />
        </button>
      </div>

      {failed && isOwn && (
        <div className="flex items-center gap-2 px-1 mt-1">
          <AlertCircle className="w-3 h-3 text-rose-400/80" />
          <span className="text-[9px] text-rose-400/80 uppercase tracking-widest font-black">Not sent</span>
          {onRetry && (
            <button
              onClick={() => onRetry(message)}
              className="flex items-center gap-1 text-[9px] text-white/40 hover:text-white/80 uppercase tracking-widest font-black transition-colors ml-1"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Retry
            </button>
          )}
        </div>
      )}

      {!failed && (
        <div className={cn(
          "flex items-center gap-1.5 px-1 transition-opacity duration-300",
          "text-[9px] uppercase tracking-[0.1em] font-bold opacity-40 group-hover:opacity-70"
        )}>
          <span className={isOwn ? "text-white/60" : "text-neutral-500"}>{timestamp}</span>
          {isOwn && (
            <span className="flex items-center">
              {status?.seenAt ? (
                <CheckCheck className="w-2.5 h-2.5 text-emerald-400/80" />
              ) : status?.deliveredAt ? (
                <CheckCheck className="w-2.5 h-2.5 text-white/40" />
              ) : (
                <Check className="w-2.5 h-2.5 text-white/20" />
              )}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
