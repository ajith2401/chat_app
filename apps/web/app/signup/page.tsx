"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AmbientBackground } from "../../components/AmbientBackground";
import { GlassContainer } from "../../components/GlassContainer";
import Link from "next/link";
import { useRouter } from "next/navigation";

import api from "../../lib/api";
import { setupNewIdentity } from "../../lib/crypto-client";

import { useAuth } from "../../contexts/AuthContext";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/signup", { email, password, name });
      const user = response.data.user;
      // The signup response set the auth cookie, so key endpoints are authorized.
      // Generate the E2EE identity + recovery code BEFORE entering the app.
      const { recoveryCode: code } = await setupNewIdentity(user._id, password);
      setPendingUser(user);
      setRecoveryCode(code);
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const finishSignup = () => {
    if (pendingUser) login("", pendingUser);
  };

  if (recoveryCode) {
    return (
      <main className="flex h-[100dvh] flex-col items-center justify-center p-6 relative overflow-hidden">
        <AmbientBackground />
        <GlassContainer className="w-full max-w-md p-10 flex flex-col gap-7">
          <div className="text-center">
            <h1 className="text-2xl font-serif text-white/90 mb-2">Your Recovery Code</h1>
            <p className="text-xs text-white/55 leading-relaxed">
              This is the <span className="text-rose-300">only</span> way to restore your private
              messages on a new device if you forget your password. We can never recover it for you.
            </p>
            <p className="text-[11px] text-white/45 leading-relaxed mt-2">
              Best kept in your password manager, a secure notes app, or written down — anywhere
              you&apos;d keep a spare key to your home.
            </p>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 text-center">
            <code className="text-sm md:text-base text-emerald-300 tracking-[0.15em] break-all font-mono leading-loose">
              {recoveryCode}
            </code>
          </div>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(recoveryCode).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="text-[10px] uppercase tracking-[0.3em] text-white/55 hover:text-white/90 transition-all font-bold"
          >
            {copied ? "Copied ✓" : "Copy to clipboard"}
          </button>

          <label className="flex items-start gap-3 cursor-pointer text-left px-1">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
            />
            <span className="text-[11px] text-white/55 leading-relaxed">
              I&apos;ve stored my recovery code somewhere safe. I understand it can&apos;t be recovered if lost.
            </span>
          </label>

          <button
            onClick={finishSignup}
            disabled={!acknowledged}
            className="bg-rose-500/20 enabled:hover:bg-rose-500/30 border border-rose-400/30 text-white rounded-xl py-4 text-xs tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(251,113,133,0.15)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </GlassContainer>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center p-6 relative overflow-hidden">
      <AmbientBackground />

      <GlassContainer className="w-full max-w-md p-10 flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-serif text-white/90 mb-2">Begin Your Journey</h1>
          <p className="text-xs text-white/55 tracking-widest uppercase">Create a space for two</p>
        </div>

        {error && <p className="text-rose-500 text-xs text-center">{error}</p>}

        <form onSubmit={handleSignup} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="signup-name" className="text-[10px] uppercase tracking-widest text-white/70 ml-1 font-bold">Your Name</label>
            <input
              id="signup-name"
              autoComplete="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
              placeholder="Full Name"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="signup-email" className="text-[10px] uppercase tracking-widest text-white/70 ml-1 font-bold">Email Address</label>
            <input
              id="signup-email"
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="signup-password" className="text-[10px] uppercase tracking-widest text-white/70 ml-1 font-bold">Password</label>
            <input
              id="signup-password"
              autoComplete="new-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-white rounded-xl py-4 text-xs tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(251,113,133,0.15)] disabled:opacity-50"
          >
            {loading ? "Creating..." : "Start Together"}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-white/30">
            Already have a space?{" "}
            <Link href="/login" className="text-white/60 hover:text-white transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </GlassContainer>
    </main>
  );
}
