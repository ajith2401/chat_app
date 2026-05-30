"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AmbientBackground } from "../../components/AmbientBackground";
import { GlassContainer } from "../../components/GlassContainer";
import Link from "next/link";
import { useRouter } from "next/navigation";

import api from "../../lib/api";

import { useAuth } from "../../contexts/AuthContext";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await api.post("/auth/signup", { email, password, name });
      login(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center p-6 relative overflow-hidden">
      <AmbientBackground />

      <GlassContainer className="w-full max-w-md p-10 flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-serif text-white/90 mb-2">Begin Your Journey</h1>
          <p className="text-xs text-white/40 tracking-widest uppercase">Create a space for two</p>
        </div>

        {error && <p className="text-rose-500 text-xs text-center">{error}</p>}

        <form onSubmit={handleSignup} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-white/70 ml-1 font-bold">Your Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
              placeholder="Full Name"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-white/70 ml-1 font-bold">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-white/70 ml-1 font-bold">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl py-4 text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50"
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
