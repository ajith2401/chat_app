"use client";

import { useState } from "react";
import Link from "next/link";
import { AmbientBackground } from "../components/AmbientBackground";
import { motion } from "framer-motion";
import { Shield, KeyRound, Heart, Bell, Image as ImageIcon, SmilePlus, Sparkles, BookOpen, ChevronDown, Lock } from "lucide-react";

const STEPS = [
  { icon: Heart, title: "Create your space", body: "Sign up in seconds. You'll get a one-time recovery code — save it; it's the only way back to your messages if you forget your password." },
  { icon: KeyRound, title: "Invite your partner", body: "Share your private invite code. Once they join, your space comes alive — just the two of you, no one else." },
  { icon: Lock, title: "Chat, end-to-end encrypted", body: "Every message and photo is encrypted on your device. Not even our servers can read them." },
  { icon: SmilePlus, title: "Make it yours", body: "React to messages, reply, share photos, set the mood, and keep memories in your shared journal." },
];

const FEATURES = [
  { icon: Shield, title: "Truly private", body: "Zero-knowledge end-to-end encryption. Your words stay between you two." },
  { icon: SmilePlus, title: "Reactions & replies", body: "Double-tap to ❤️, react with emojis, and reply to any whisper." },
  { icon: ImageIcon, title: "Encrypted photos", body: "Share moments — images are encrypted before they ever leave your device." },
  { icon: Bell, title: "Notifications", body: "Know the moment your partner messages, even when the app is closed." },
  { icon: BookOpen, title: "Journal & story", body: "Keep a shared timeline of memories and milestones." },
  { icon: Sparkles, title: "AI mood (optional)", body: "Opt in to gentle mood insights — off by default, your choice." },
];

const FAQS = [
  { q: "Is it really private?", a: "Yes. Messages and photos are end-to-end encrypted on your device using your conversation key. By default not even our servers can read them — they only ever store ciphertext." },
  { q: "What is the recovery code?", a: "At signup you get a one-time recovery code. Because your password unlocks your encryption keys, the recovery code is the only way to restore your message history on a new device or if you forget your password. Store it somewhere safe — we can never recover it for you." },
  { q: "How do we connect as a couple?", a: "One of you creates a space and gets an invite code. The other signs up and enters that code. Once joined, your secure channel forms automatically and you can chat." },
  { q: "Can I use it on my phone?", a: "Yes — it works in any modern mobile browser. For notifications on iPhone, add the site to your Home Screen first (iOS requirement). On Android and desktop, just enable notifications in Settings." },
  { q: "Does the AI read our messages?", a: "Only if a partner explicitly opts in from Settings — it's off by default. Either of you can enable it for the relationship (it doesn't require both), and either of you can revoke it anytime, which immediately removes the key and deletes the AI's memory." },
  { q: "What if I forget my password?", a: "Use 'Forgot password' to reset it by email. Note: because your password protects your encryption keys, after a reset you'll need your recovery code to unlock your old messages on a device." },
];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className="w-full text-left p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm sm:text-base text-white/85 font-medium">{q}</span>
        <ChevronDown className={`w-4 h-4 text-white/50 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && <p className="mt-3 text-xs sm:text-sm text-white/60 leading-relaxed font-light">{a}</p>}
    </button>
  );
}

export default function Home() {
  return (
    <main className="min-h-[100dvh] w-full overflow-y-auto relative bg-[#050505] scrollbar-hide">
      <AmbientBackground />
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center text-center px-6 gap-8">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-serif text-white/90 tracking-tight">
          A Space for Us.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }}
          className="max-w-xl text-white/55 text-sm md:text-base leading-relaxed font-light tracking-wide">
          A premium, private space designed exclusively for your relationship. Capture memories, share moments,
          and grow closer — with end-to-end encryption so it stays between the two of you.
        </motion.p>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 mt-2">
          <Link href="/signup" className="px-10 py-4 bg-white/15 hover:bg-white/25 border border-rose-400/30 rounded-2xl text-white text-sm tracking-widest uppercase transition-all backdrop-blur-md shadow-[0_0_24px_rgba(251,113,133,0.12)]">
            Get Started
          </Link>
          <Link href="/login" className="px-10 py-4 hover:bg-white/5 text-white/60 hover:text-white rounded-2xl text-sm tracking-widest uppercase transition-all">
            Sign In
          </Link>
        </motion.div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/65 font-bold mt-4">
          <Shield className="w-3.5 h-3.5 text-emerald-400/70" /> Zero-knowledge E2EE · Your words, only yours
        </div>
        <Link href="#guide" className="absolute bottom-8 text-white/40 hover:text-white/70 transition-colors animate-bounce">
          <ChevronDown className="w-6 h-6" />
        </Link>
      </section>

      {/* How it works */}
      <section id="guide" className="relative z-10 max-w-5xl mx-auto px-6 py-24 flex flex-col gap-12">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-rose-400/50 font-black mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-serif text-white/90 tracking-tight">Together in four steps</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {STEPS.map((s, i) => (
            <motion.div key={s.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.05 }}
              className="flex gap-5 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-400/15 flex items-center justify-center flex-shrink-0">
                <s.icon className="w-5 h-5 text-rose-300/70" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-white/30 font-mono">0{i + 1}</span>
                  <h3 className="text-base text-white/85 font-medium">{s.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-light">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-12 flex flex-col gap-12">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-indigo-400/50 font-black mb-3">Everything you need</p>
          <h2 className="text-3xl md:text-4xl font-serif text-white/90 tracking-tight">Made for two</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.04 }}
              className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-white/60" />
              </div>
              <h3 className="text-sm text-white/85 font-medium">{f.title}</h3>
              <p className="text-xs text-white/60 leading-relaxed font-light">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-24 flex flex-col gap-10">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-black mb-3">Questions</p>
          <h2 className="text-3xl md:text-4xl font-serif text-white/90 tracking-tight">Good to know</h2>
        </div>
        <div className="flex flex-col gap-3">
          {FAQS.map((f) => <Faq key={f.q} {...f} />)}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-28 text-center flex flex-col items-center gap-6">
        <Heart className="w-8 h-8 text-rose-400/40" />
        <h2 className="text-2xl md:text-3xl font-serif text-white/90 italic">Begin your space today.</h2>
        <Link href="/signup" className="px-10 py-4 bg-white/15 hover:bg-white/25 border border-rose-400/30 rounded-2xl text-white text-sm tracking-widest uppercase transition-all backdrop-blur-md shadow-[0_0_24px_rgba(251,113,133,0.12)]">
          Get Started
        </Link>
        <p className="text-[10px] text-white/20 tracking-wide mt-4">A private place for two · End-to-end encrypted</p>
      </section>
    </main>
  );
}
