"use client";

import { AmbientBackground } from "../../components/AmbientBackground";
import { GlassContainer } from "../../components/GlassContainer";
import { useAuth } from "../../contexts/AuthContext";
import { LogOut, User, Shield, Bell, Heart, Copy, Check, Edit2, Save, X, Wifi, WifiOff, Camera, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { BottomNav } from "../../components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../lib/api";
import { AIConsentCard } from "../../components/AIConsentCard";
import { NotificationsCard } from "../../components/NotificationsCard";

interface Partner {
  _id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  presenceStatus?: string;
}

interface RelationshipData {
  status: "pending" | "active";
  inviteCode?: string;
  partner?: Partner;
  currentMood?: string;
}

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [rel, setRel] = useState<RelationshipData | null>(null);
  const [relLoading, setRelLoading] = useState(true);

  useEffect(() => {
    if (!user?.relationshipId) { setRelLoading(false); return; }
    api.get("/relationships/me").then((res) => {
      const data = res.data;
      const partner =
        data.user1Id?._id === user._id ? data.user2Id : data.user1Id;
      setRel({
        status: data.status,
        inviteCode: data.inviteCode,
        partner: partner || null,
        currentMood: data.currentMood,
      });
    }).catch(() => {}).finally(() => setRelLoading(false));
  }, [user]);

  const copyInviteCode = () => {
    if (rel?.inviteCode) {
      navigator.clipboard.writeText(rel.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/me", { name });
      await refreshUser();
      setIsEditing(false);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  // Profile picture upload. Avatars are shown directly to your partner and across
  // the app, so they are stored as normal (unencrypted) Cloudinary images.
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setAvatarError("JPG, PNG, WebP or GIF only"); setTimeout(() => setAvatarError(null), 3000); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Max 5 MB"); setTimeout(() => setAvatarError(null), 3000); return;
    }
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const { data: sig } = await api.post("/media/request-upload", { folder: "avatars" });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", sig.timestamp.toString());
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");
      await api.patch("/auth/me", { avatarUrl: data.secure_url });
      await refreshUser();
    } catch (err: any) {
      setAvatarError(err.message || "Upload failed"); setTimeout(() => setAvatarError(null), 3000);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [verifySent, setVerifySent] = useState(false);
  const resendVerification = async () => {
    try { await api.post("/auth/resend-verification"); setVerifySent(true); } catch { /* ignore */ }
  };

  const avatarLetter = (n?: string) => (n || "?").charAt(0).toUpperCase();

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-start p-4 md:p-8 pb-28 overflow-y-auto bg-[#050505] scrollbar-hide">
      <AmbientBackground />

      <div className="w-full max-w-2xl flex flex-col gap-8 mt-12 font-sans">
        <header className="px-2">
          <h1 className="text-5xl font-serif text-white/90 tracking-tighter italic">Our Space</h1>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] mt-3 font-bold">Settings & Privacy</p>
        </header>

        {/* ── Profile card ── */}
        <GlassContainer className="p-8 sm:p-10 flex flex-col gap-8" intensity="medium">
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-white/10 shadow-xl flex items-center justify-center bg-gradient-to-br from-rose-500/20 to-indigo-500/20 text-white/50 font-serif text-3xl"
                title="Change profile photo"
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="You" className="w-full h-full object-cover" />
                ) : (
                  avatarLetter(user?.name)
                )}
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white/90" />}
                </span>
              </button>
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-[2.5px] border-[#050505] shadow pointer-events-none" />
              {avatarError && <p className="absolute -bottom-6 left-0 whitespace-nowrap text-[9px] text-rose-400 uppercase tracking-wider font-bold">{avatarError}</p>}
            </div>

            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                    <input
                      autoFocus
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateProfile()}
                      className="bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white text-xl font-serif focus:outline-none focus:border-white/30 transition-all"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleUpdateProfile} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 text-white text-[10px] uppercase tracking-widest font-bold hover:bg-white/20 transition-all disabled:opacity-50">
                        <Save className="w-3 h-3" /> {saving ? "Saving…" : "Save"}
                      </button>
                      <button onClick={() => { setIsEditing(false); setName(user?.name || ""); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white/40 text-[10px] uppercase tracking-widest font-bold hover:text-white/60 transition-all">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start justify-between group">
                    <div className="min-w-0">
                      <h2 className="text-2xl sm:text-3xl font-serif text-white/90 tracking-tight truncate">{user?.name}</h2>
                      <p className="text-xs text-white/30 mt-1.5 font-mono tracking-wider truncate">{user?.email}</p>
                    </div>
                    <button onClick={() => setIsEditing(true)}
                      className="ml-4 p-2.5 rounded-full hover:bg-white/5 text-white/20 hover:text-white/60 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassContainer>

        {/* ── Email verification banner ── */}
        {user && user.emailVerified === false && (
          <GlassContainer className="p-5 sm:p-6 flex items-center justify-between gap-4" intensity="low">
            <div className="flex items-center gap-3 min-w-0">
              <Shield className="w-5 h-5 text-amber-400/70 flex-shrink-0" />
              <p className="text-xs text-white/50 leading-relaxed">
                {verifySent ? "Verification email sent — check your inbox." : "Your email isn't verified yet."}
              </p>
            </div>
            {!verifySent && (
              <button onClick={resendVerification}
                className="flex-shrink-0 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[10px] uppercase tracking-widest font-bold hover:bg-white/10 transition-all">
                Resend
              </button>
            )}
          </GlassContainer>
        )}

        {/* ── Relationship / partner card ── */}
        <GlassContainer className="p-8 sm:p-10 flex flex-col gap-6" intensity="medium">
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black">Relationship Space</span>

          {relLoading ? (
            <div className="h-24 rounded-2xl bg-white/[0.02] animate-pulse" />
          ) : rel?.status === "active" && rel.partner ? (
            /* ── Active: show partner details ── */
            <div className="flex flex-col gap-4">
              {/* Connected banner */}
              <div className="flex items-center justify-center gap-4 py-3">
                {/* My avatar */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center text-white/60 font-serif text-xl overflow-hidden">
                    {user?.avatarUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={user.avatarUrl} alt="You" className="w-full h-full object-cover" />
                      : avatarLetter(user?.name)}
                  </div>
                  <span className="text-[10px] text-white/40 font-medium tracking-wide truncate max-w-[70px] text-center">{user?.name}</span>
                </div>

                {/* Heart connector */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex flex-col items-center gap-1"
                >
                  <Heart className="w-6 h-6 text-rose-400 fill-rose-400/30" />
                  <span className="text-[8px] uppercase tracking-[0.2em] text-rose-400/50 font-black">Connected</span>
                </motion.div>

                {/* Partner avatar */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-rose-500/20 border border-white/10 flex items-center justify-center text-white/60 font-serif text-xl overflow-hidden">
                      {(rel.partner as any).avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={(rel.partner as any).avatarUrl} alt={rel.partner.name} className="w-full h-full object-cover" />
                        : avatarLetter(rel.partner.name)}
                    </div>
                    <div className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-[#050505] ${rel.partner.presenceStatus === "online" ? "bg-emerald-500" : "bg-neutral-600"}`} />
                  </div>
                  <span className="text-[10px] text-white/40 font-medium tracking-wide truncate max-w-[70px] text-center">{rel.partner.name}</span>
                </div>
              </div>

              {/* Partner detail row */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-1.5 ${rel.partner.presenceStatus === "online" ? "text-emerald-400" : "text-white/30"}`}>
                    {rel.partner.presenceStatus === "online"
                      ? <Wifi className="w-3.5 h-3.5" />
                      : <WifiOff className="w-3.5 h-3.5" />
                    }
                    <span className="text-[10px] uppercase tracking-widest font-black">
                      {rel.partner.presenceStatus === "online" ? "Online now" : "Offline"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-black">Partner</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                </div>
              </div>

              {/* Current mood */}
              {rel.currentMood && rel.currentMood !== "neutral" && (
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] px-6 py-3 flex items-center gap-3">
                  <Heart className="w-3.5 h-3.5 text-rose-400/60" />
                  <span className="text-xs text-white/40 capitalize">Current vibe: <span className="text-white/70 font-medium">{rel.currentMood.replace("_", " ")}</span></span>
                </div>
              )}
            </div>
          ) : rel?.inviteCode ? (
            /* ── Pending: show invite code ── */
            <div className="flex flex-col gap-3">
              <p className="text-xs text-white/40 leading-relaxed font-light">
                Your space is ready. Share this code with your partner — they paste it on the onboarding screen to join.
              </p>
              <button
                onClick={copyInviteCode}
                className="w-full flex items-center justify-between px-6 py-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.14] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-rose-400/70" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-black mb-0.5">Invite code</p>
                    <p className="text-lg font-serif text-white/90 tracking-[0.15em]">{rel.inviteCode}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-black transition-all ${copied ? "text-emerald-400" : "text-white/20 group-hover:text-white/50"}`}>
                  {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                </div>
              </button>
              <p className="text-[9px] text-white/15 italic text-center">Waiting for partner to join…</p>
            </div>
          ) : (
            <p className="text-sm text-white/30 italic text-center py-4">No relationship found.</p>
          )}
        </GlassContainer>

        {/* ── Notifications ── */}
        <NotificationsCard />

        {/* ── AI consent (E2EE opt-in) ── */}
        {user?.relationshipId && <AIConsentCard />}

        {/* ── System settings ── */}
        <GlassContainer className="p-6 sm:p-8 flex flex-col gap-3" intensity="low">
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black mb-1">Preferences</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="flex items-center gap-4 px-6 py-4 rounded-[1.1rem] bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-all text-white/40 hover:text-white/80 group">
              <Bell className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              <span className="text-xs font-bold uppercase tracking-widest">Notifications</span>
            </button>
            <button className="flex items-center gap-4 px-6 py-4 rounded-[1.1rem] bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-all text-white/40 hover:text-white/80 group">
              <Shield className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              <span className="text-xs font-bold uppercase tracking-widest">Security</span>
            </button>
          </div>
        </GlassContainer>

        {/* ── Logout ── */}
        <button
          onClick={logout}
          className="flex items-center justify-center gap-3 w-full py-5 rounded-[1.25rem] bg-rose-500/5 border border-rose-500/10 text-rose-300/50 hover:bg-rose-500/10 hover:text-rose-300/80 transition-all text-[10px] tracking-[0.3em] uppercase font-black"
        >
          <LogOut className="w-4 h-4" />
          Terminate Session
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
