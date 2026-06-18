"use client";

import { useState, Suspense } from "react";
import { AmbientBackground } from "../../components/AmbientBackground";
import { GlassContainer } from "../../components/GlassContainer";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import api from "../../lib/api";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Reset link is invalid or expired");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <p className="text-center text-sm text-rose-400">Missing reset token. Use the link from your email.</p>;
  }
  if (done) {
    return (
      <div className="text-center flex flex-col gap-3">
        <p className="text-sm text-emerald-300/80">Password updated. Redirecting to sign in…</p>
        <p className="text-[11px] text-rose-300/70 leading-relaxed bg-rose-950/20 border border-rose-500/15 rounded-xl p-3">
          To read your old encrypted messages, unlock with your <b>recovery code</b> after signing in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder="New password" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all" />
      <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all" />
      <button type="submit" disabled={loading}
        className="bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl py-4 text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50">
        {loading ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center p-6 relative overflow-hidden">
      <AmbientBackground />
      <GlassContainer className="w-full max-w-md p-10 flex flex-col gap-7">
        <div className="text-center">
          <h1 className="text-3xl font-serif text-white/90 mb-2">Reset password</h1>
          <p className="text-xs text-white/40 tracking-wide">Choose a new password</p>
        </div>
        <Suspense fallback={<p className="text-center text-white/40 text-sm">Loading…</p>}>
          <ResetForm />
        </Suspense>
        <Link href="/login" className="text-center text-white/40 hover:text-white/70 text-[10px] uppercase tracking-[0.3em] font-bold">Back to sign in</Link>
      </GlassContainer>
    </main>
  );
}
