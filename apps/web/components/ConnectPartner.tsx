"use client";

import { useState, useEffect } from "react";
import { AmbientBackground } from "./AmbientBackground";
import { GlassContainer } from "./GlassContainer";
import { Heart, Copy, Check, Loader2, Share2 } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export function ConnectPartner() {
  const { refreshUser } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/relationships/me")
      .then((res) => setInviteCode(res.data?.inviteCode || null))
      .catch(() => setInviteCode(null));
  }, []);

  const copy = () => {
    if (!inviteCode) return;
    navigator.clipboard?.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (!inviteCode) return;
    const text = `Join our private space on A Space for Us 💜 — use my code: ${inviteCode}\n${window.location.origin}`;
    if (navigator.share) { try { await navigator.share({ title: "A Space for Us", text }); } catch { /* cancelled */ } }
    else copy();
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = partnerCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    try {
      await api.post("/relationships/join", { inviteCode: code });
      await refreshUser();
      window.location.reload(); // re-enter chat as an active relationship
    } catch (err: any) {
      setError(err.response?.data?.message || "Couldn't join — check the code");
      setJoining(false);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center p-4 md:p-8 bg-[#050505] overflow-y-auto">
      <AmbientBackground />
      <GlassContainer className="w-full max-w-md p-8 sm:p-10 flex flex-col gap-8 my-auto" intensity="high">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <Heart className="w-7 h-7 text-rose-400/60 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-white/90 tracking-tight">Invite your partner</h1>
          <p className="text-xs text-white/40 leading-relaxed">
            Share your secret code so they can join your private space. The moment they do, your chat comes alive.
          </p>
        </div>

        {/* Your code */}
        <div className="flex flex-col gap-3">
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-black text-center">Your code</span>
          <button onClick={copy}
            className="group relative py-6 px-4 rounded-2xl bg-white/[0.03] border border-dashed border-white/15 hover:border-white/30 transition-all">
            <span className="text-2xl sm:text-3xl font-serif tracking-[0.25em] text-white/90">
              {inviteCode || <Loader2 className="w-6 h-6 animate-spin inline text-white/30" />}
            </span>
            <span className="absolute top-3 right-3 p-2 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/40" />}
            </span>
          </button>
          <div className="flex gap-2">
            <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[10px] uppercase tracking-widest font-bold hover:bg-white/10 transition-all">
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
            <button onClick={share} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[10px] uppercase tracking-widest font-bold hover:bg-white/10 transition-all">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="h-px bg-white/5 flex-1" />
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black">or</span>
          <div className="h-px bg-white/5 flex-1" />
        </div>

        {/* Join with their code */}
        <form onSubmit={join} className="flex flex-col gap-3">
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-black text-center">Have their code?</span>
          {error && <p className="text-rose-400 text-[11px] text-center">{error}</p>}
          <input
            value={partnerCode}
            onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
            placeholder="LOVE-XXXXXX"
            className="bg-white/[0.03] border border-white/10 rounded-xl py-4 px-5 text-center text-sm text-white tracking-[0.2em] font-medium placeholder:text-white/15 focus:outline-none focus:border-white/25 transition-all uppercase"
          />
          <button type="submit" disabled={joining || !partnerCode.trim()}
            className="flex items-center justify-center gap-2 py-4 rounded-xl bg-indigo-500/15 border border-indigo-400/25 text-indigo-100 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-indigo-500/25 transition-all disabled:opacity-40">
            {joining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {joining ? "Joining…" : "Join their space"}
          </button>
          <p className="text-[10px] text-white/25 text-center leading-relaxed">
            Joining their space replaces this empty one.
          </p>
        </form>
      </GlassContainer>
    </div>
  );
}
