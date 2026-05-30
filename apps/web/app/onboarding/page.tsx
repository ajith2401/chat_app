"use client";

import { useState, useEffect, useRef } from "react";
import { AmbientBackground } from "../../components/AmbientBackground";
import { GlassContainer } from "../../components/GlassContainer";
import api from "../../lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowRight, Copy, Check, Users } from "lucide-react";
import { io } from "socket.io-client";

export default function OnboardingPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const { refreshUser } = useAuth();
  const router = useRouter();

  // Listen for partner joining — auto-redirect when relationship activates
  useEffect(() => {
    if (!generatedCode) return;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4005", {
      withCredentials: true,
    });
    socket.on("relationship_activated", async () => {
      await refreshUser();
      router.push("/chat");
    });
    return () => { socket.disconnect(); };
  }, [generatedCode, refreshUser, router]);

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/relationships/create");
      setGeneratedCode(res.data.inviteCode);
    } catch (err) {
      setError("Failed to create space. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/relationships/join", { inviteCode });
      await refreshUser();
      router.push("/chat");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid Invite Code");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnterSpace = async () => {
    await refreshUser();
    router.push("/chat");
  };

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center p-6 relative overflow-hidden bg-[#050505]">
      <AmbientBackground />
      
      <div className="z-10 w-full max-w-lg">
        <AnimatePresence mode="wait">
          {!generatedCode ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <GlassContainer className="p-12 flex flex-col gap-10" intensity="high">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                    <Heart className="w-8 h-8 text-rose-400/60" />
                  </div>
                  <h1 className="text-4xl font-serif text-white/90 mb-3 tracking-tight">Your Private Space</h1>
                  <p className="text-sm text-white/40 leading-relaxed font-light">
                    Every beautiful journey begins with a single step. <br />
                    Start your shared story today.
                  </p>
                </div>

                <div className="flex flex-col gap-8">
                  <button 
                    onClick={handleCreate}
                    disabled={loading}
                    className="group w-full relative overflow-hidden bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-2xl py-5 text-xs tracking-[0.3em] uppercase transition-all shadow-xl"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Start New Space <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>

                  <div className="relative flex items-center gap-6">
                    <div className="h-px bg-white/5 flex-1" />
                    <span className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black">or</span>
                    <div className="h-px bg-white/5 flex-1" />
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="PASTE PARTNER'S CODE"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-6 text-sm text-white focus:outline-none focus:border-white/20 transition-all text-center tracking-[0.2em] placeholder:text-white/10 font-medium uppercase"
                      />
                    </div>
                    <button 
                      onClick={handleJoin}
                      disabled={loading || !inviteCode}
                      className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-200 rounded-2xl py-5 text-xs tracking-[0.3em] uppercase transition-all disabled:opacity-20"
                    >
                      Join Partner
                    </button>
                  </div>
                </div>
                
                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-rose-400 text-[10px] text-center uppercase tracking-widest font-bold"
                  >
                    {error}
                  </motion.p>
                )}
              </GlassContainer>
            </motion.div>
          ) : (
            <motion.div
              key="generated"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <GlassContainer className="p-12 flex flex-col gap-10 text-center" intensity="high">
                <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Users className="w-10 h-10 text-indigo-400/60" />
                </div>
                
                <div>
                  <h2 className="text-3xl font-serif text-white/90 mb-3 tracking-tight italic">Waiting for them...</h2>
                  <p className="text-sm text-white/40 font-light leading-relaxed">
                    Your space is ready. Share this secret code <br /> 
                    with your partner to let them in.
                  </p>
                </div>

                <div 
                  onClick={copyToClipboard}
                  className="group relative cursor-pointer py-8 px-4 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 hover:border-white/20 transition-all"
                >
                  <span className="text-5xl font-serif tracking-[0.2em] text-white/90 pl-4">{generatedCode}</span>
                  <div className="absolute top-3 right-3 p-2 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/40" />}
                  </div>
                  <p className="mt-4 text-[9px] uppercase tracking-[0.3em] text-white/20 font-bold">Click to copy code</p>
                </div>

                <button 
                  onClick={handleEnterSpace}
                  className="w-full text-white/30 hover:text-white/60 text-[10px] uppercase tracking-[0.4em] font-black transition-all"
                >
                  Continue to Chat
                </button>
              </GlassContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cinematic background flares */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
    </main>
  );
}
