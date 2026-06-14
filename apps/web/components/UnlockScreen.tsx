"use client";

import { useState } from "react";
import { AmbientBackground } from "./AmbientBackground";
import { GlassContainer } from "./GlassContainer";
import { Lock, Loader2 } from "lucide-react";

interface UnlockScreenProps {
  mode: "locked" | "waiting";
  error: string | null;
  onUnlock: (password: string) => Promise<void>;
  onRestore: (code: string) => Promise<void>;
}

export function UnlockScreen({ mode, error, onUnlock, onRestore }: UnlockScreenProps) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);

  if (mode === "waiting") {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center p-6 bg-[#050505]">
        <AmbientBackground />
        <GlassContainer className="w-full max-w-md p-10 text-center flex flex-col items-center gap-6" intensity="high">
          <Loader2 className="w-8 h-8 text-rose-400/50 animate-spin" />
          <h1 className="text-2xl font-serif text-white/90">Securing your channel…</h1>
          <p className="text-xs text-white/40 leading-relaxed">
            Your partner set up the private space. As soon as they next open the chat, your
            encrypted history unlocks here automatically.
          </p>
        </GlassContainer>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (useRecovery) await onRestore(code.trim());
      else await onUnlock(password);
    } catch {
      /* error surfaced via prop */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center p-6 bg-[#050505]">
      <AmbientBackground />
      <GlassContainer className="w-full max-w-md p-10 flex flex-col gap-7" intensity="high">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-rose-400/60" />
          </div>
          <h1 className="text-2xl font-serif text-white/90">Unlock your messages</h1>
          <p className="text-xs text-white/40 leading-relaxed">
            Your conversations are end-to-end encrypted. Enter your{" "}
            {useRecovery ? "recovery code" : "password"} to decrypt them on this device.
          </p>
        </div>

        {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

        <form onSubmit={submit} className="flex flex-col gap-4">
          {useRecovery ? (
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABCD-EFGH-IJKL-…"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono tracking-widest placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
            />
          ) : (
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
            />
          )}

          <button
            type="submit"
            disabled={busy}
            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl py-4 text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? "Unlocking…" : "Unlock"}
          </button>
        </form>

        <button
          onClick={() => setUseRecovery((v) => !v)}
          className="text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-white/70 transition-all font-bold"
        >
          {useRecovery ? "Use password instead" : "Forgot password? Use recovery code"}
        </button>
      </GlassContainer>
    </div>
  );
}
