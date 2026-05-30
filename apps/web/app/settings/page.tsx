"use client";

import { AmbientBackground } from "../../components/AmbientBackground";
import { GlassContainer } from "../../components/GlassContainer";
import { useAuth } from "../../contexts/AuthContext";
import { LogOut, User, Shield, Bell, Heart, Copy, Check, Edit2, Save, X } from "lucide-react";
import { useState, useEffect } from "react";
import { BottomNav } from "../../components/BottomNav";
import api from "../../lib/api";

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchInviteCode = async () => {
      try {
        const res = await api.get("/relationships/me");
        setInviteCode(res.data.inviteCode);
      } catch (err) {
        console.error("Failed to fetch invite code", err);
      }
    };
    if (user?.relationshipId) fetchInviteCode();
  }, [user]);

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert("No invite code found. Partner may have already joined.");
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await api.patch("/auth/me", { name });
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-start p-4 md:p-8 overflow-y-auto bg-[#050505] scrollbar-hide">
      <AmbientBackground />
      
      <div className="w-full max-w-2xl flex flex-col gap-8 mb-40 mt-16 font-sans">
        <header className="px-6">
          <h1 className="text-5xl font-serif text-white/90 tracking-tighter italic">Our Space</h1>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] mt-4 font-bold">Settings & Privacy</p>
        </header>

        <GlassContainer className="p-12 flex flex-col gap-12" intensity="high">
          <div className="flex items-center gap-8 pb-10 border-b border-white/5">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500/10 to-indigo-500/10 flex items-center justify-center border border-white/10 shadow-2xl relative">
              <div className="absolute inset-0 bg-white/5 rounded-full animate-pulse" />
              <User className="w-10 h-10 text-white/20 relative z-10" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xl font-serif focus:outline-none focus:border-white/20"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleUpdateProfile}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-[10px] uppercase tracking-widest font-bold hover:bg-white/20 transition-all"
                    >
                      <Save className="w-3 h-3" /> Save
                    </button>
                    <button 
                      onClick={() => { setIsEditing(false); setName(user?.name || ""); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/40 text-[10px] uppercase tracking-widest font-bold hover:text-white/60 transition-all"
                    >
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <div>
                    <h2 className="text-3xl font-serif text-white/90 tracking-tight">{user?.name}</h2>
                    <p className="text-xs text-white/30 mt-2 font-mono tracking-wider">{user?.email}</p>
                  </div>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-3 rounded-full hover:bg-white/5 text-white/20 hover:text-white/60 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black ml-1">Relationship Space</span>
              <button 
                onClick={copyInviteCode}
                className="w-full flex items-center justify-between px-8 py-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group"
              >
                <div className="flex items-center gap-5">
                  <Heart className="w-5 h-5 text-rose-400/50 group-hover:scale-110 transition-transform" />
                  <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                    {inviteCode ? `Partner Code: ${inviteCode}` : "Invite Partner (Copy Code)"}
                  </span>
                </div>
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-all" />}
              </button>
              {!inviteCode && <p className="text-[9px] text-white/10 italic text-center">Relationship is active</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="flex items-center gap-4 px-8 py-5 rounded-[1.25rem] bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.04] transition-all text-white/40 hover:text-white/80 group">
                <Bell className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs font-bold uppercase tracking-widest">Notifications</span>
              </button>
              <button className="flex items-center gap-4 px-8 py-5 rounded-[1.25rem] bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.04] transition-all text-white/40 hover:text-white/80 group">
                <Shield className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs font-bold uppercase tracking-widest">Security</span>
              </button>
            </div>
          </div>

          <button 
            onClick={logout}
            className="mt-6 flex items-center justify-center gap-4 w-full py-5 rounded-[1.25rem] bg-rose-500/5 border border-rose-500/10 text-rose-300/40 hover:bg-rose-500/10 hover:text-rose-300/80 transition-all text-[10px] tracking-[0.3em] uppercase font-black"
          >
            <LogOut className="w-4 h-4" />
            Terminate Session
          </button>
        </GlassContainer>
      </div>

      <BottomNav />
    </div>
  );
}
