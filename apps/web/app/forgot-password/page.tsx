"use client";

import { useState } from "react";
import { AmbientBackground } from "../../components/AmbientBackground";
import { GlassContainer } from "../../components/GlassContainer";
import Link from "next/link";
import api from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } catch { /* always show the same message */ } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center p-6 relative overflow-hidden">
      <AmbientBackground />
      <GlassContainer className="w-full max-w-md p-10 flex flex-col gap-7">
        <div className="text-center">
          <h1 className="text-3xl font-serif text-white/90 mb-2">Forgot password</h1>
          <p className="text-xs text-white/40 tracking-wide">We'll email you a reset link</p>
        </div>

        {sent ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-white/60 leading-relaxed">
              If an account exists for <span className="text-white/80">{email}</span>, a reset link is on its way.
              Check your inbox (and spam).
            </p>
            <p className="text-[11px] text-rose-300/70 leading-relaxed bg-rose-950/20 border border-rose-500/15 rounded-xl p-3">
              Heads up: after resetting, you'll need your <b>recovery code</b> to unlock your encrypted messages on a device.
            </p>
            <Link href="/login" className="text-white/50 hover:text-white text-[10px] uppercase tracking-[0.3em] font-bold">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
            />
            <button type="submit" disabled={loading}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl py-4 text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50">
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <Link href="/login" className="text-center text-white/40 hover:text-white/70 text-[10px] uppercase tracking-[0.3em] font-bold">Back to sign in</Link>
          </form>
        )}
      </GlassContainer>
    </main>
  );
}
