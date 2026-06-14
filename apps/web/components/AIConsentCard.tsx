"use client";

import { useEffect, useState } from "react";
import { GlassContainer } from "./GlassContainer";
import { Sparkles, Loader2, ShieldCheck } from "lucide-react";
import api from "../lib/api";
import { sealCKForAI } from "../lib/crypto-client";
import { useCrypto } from "../contexts/CryptoContext";

const AI_PUBLIC_KEY = process.env.NEXT_PUBLIC_AI_PUBLIC_KEY || "";

export function AIConsentCard() {
  const { status } = useCrypto();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/relationships/me").then((res) => {
      const flags: string[] = res.data?.themePreferences?.featureFlags || [];
      setEnabled(flags.includes("ai-insights"));
    }).catch(() => setEnabled(false));
  }, []);

  const enable = async () => {
    setError(null);
    if (status !== "ready") { setError("Unlock your messages first."); return; }
    if (!AI_PUBLIC_KEY) { setError("AI is not configured on this server."); return; }
    setBusy(true);
    try {
      const wrappedCKForAI = sealCKForAI(AI_PUBLIC_KEY);
      await api.post("/keys/ai-grant", { wrappedCKForAI });
      setEnabled(true);
      setConfirming(false);
    } catch {
      setError("Could not enable AI insights.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.delete("/keys/ai-grant");
      setEnabled(false);
    } catch {
      setError("Could not disable AI insights.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassContainer className="p-8 sm:p-10 flex flex-col gap-5" intensity="medium">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-indigo-300/70" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-serif text-white/90">AI Insights</h2>
          <p className="text-xs text-white/40 leading-relaxed">
            Your chat is end-to-end encrypted — by default not even our servers can read it.
            Turning this on grants our AI permission to read your <span className="text-white/70">future</span>{" "}
            messages so it can sense your mood and surface memories. You can turn it off anytime.
          </p>
        </div>
      </div>

      {error && <p className="text-rose-400 text-xs">{error}</p>}

      {enabled === null ? (
        <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
      ) : enabled ? (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-emerald-300/70 font-bold">
            <ShieldCheck className="w-4 h-4" /> AI insights on
          </span>
          <button
            onClick={disable}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {busy ? "Turning off…" : "Turn off"}
          </button>
        </div>
      ) : confirming ? (
        <div className="flex flex-col gap-3 bg-black/30 border border-white/10 rounded-xl p-4">
          <p className="text-[11px] text-white/50 leading-relaxed">
            This shares your conversation key with our AI service so it can read future messages.
            Existing messages stay private unless re-processed. Continue?
          </p>
          <div className="flex gap-3">
            <button
              onClick={enable}
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-100 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              I understand — Enable
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="self-start px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/10 transition-all"
        >
          Enable AI insights
        </button>
      )}
    </GlassContainer>
  );
}
