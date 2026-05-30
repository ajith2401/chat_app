"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AmbientBackground } from "../../components/AmbientBackground";
import { GlassContainer } from "../../components/GlassContainer";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Plus, Sparkles, X, Save, Loader2 } from "lucide-react";
import { BottomNav } from "../../components/BottomNav";
import { useJournalStore } from "../../store/useJournalStore";
import { usePresenceStore } from "../../store/usePresenceStore";
import { useAuth } from "../../contexts/AuthContext";
import { Skeleton } from "../../components/Skeleton";

export default function JournalPage() {
  const { entries, fetchEntries, loading, addEntry } = useJournalStore();
  const [isModalOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"journal" | "milestone">("journal");
  const [saving, setSaving] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const relationshipStatus = usePresenceStore((s) => s.relationshipStatus);
  const fetchRelationship = usePresenceStore((s) => s.fetchRelationship);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchRelationship(user._id);
  }, [user, fetchRelationship]);

  useEffect(() => {
    if (relationshipStatus === "pending") router.push("/onboarding");
  }, [relationshipStatus, router]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addEntry({ title, content, type, date: new Date().toISOString() });
      setIsOpen(false);
      setTitle("");
      setContent("");
      setType("journal");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-start p-4 md:p-8 overflow-y-auto bg-[#050505] scrollbar-hide">
      <AmbientBackground />
      
      <div className="w-full max-w-4xl flex flex-col gap-8 mb-40 mt-10 font-sans">
        <header className="flex items-center justify-between px-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-serif text-white/90 tracking-tight">Our Journal</h1>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-3 font-bold italic">Shared memories, whispered thoughts</p>
          </motion.div>
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="p-4 rounded-2xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all shadow-2xl"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-56 w-full rounded-[2.5rem]" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center opacity-30"
          >
            <Sparkles className="w-16 h-16 mb-6 stroke-[1px]" />
            <h3 className="font-serif text-2xl italic">The book is yet to be written.</h3>
            <p className="text-xs uppercase tracking-[0.3em] mt-4 font-bold">Add your first shared memory</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
            <AnimatePresence>
              {entries.map((entry) => (
                <GlassContainer 
                  key={entry._id} 
                  className="p-8 flex flex-col gap-5 group cursor-pointer border-white/5 hover:border-white/20 transition-all duration-500"
                  intensity="medium"
                  interactive
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-black">
                      {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="text-[9px] px-3 py-1 rounded-full bg-rose-500/10 text-rose-300/60 border border-rose-500/10 font-bold uppercase tracking-wider">{entry.type === "milestone" ? "Milestone" : (entry.moodTag || 'Shared')}</span>
                  </div>
                  <h3 className="text-2xl font-serif text-white/90 group-hover:text-white transition-colors leading-tight font-medium">{entry.title}</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed font-sans font-light line-clamp-3 italic group-hover:text-white/50 transition-colors">"{entry.content}"</p>
                </GlassContainer>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg z-10"
            >
              <GlassContainer className="p-10 flex flex-col gap-8 shadow-2xl border-white/20" intensity="high">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif text-white/90 italic">New Memory</h2>
                  <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-white/40 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6 font-sans">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 ml-1 font-bold">Title</label>
                    <input 
                      type="text" 
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give it a name..."
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 ml-1 font-bold">Entry Type</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setType("journal")}
                        className={`flex-1 py-3 rounded-xl border text-[10px] uppercase tracking-widest font-black transition-all ${type === "journal" ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/20 hover:border-white/10"}`}
                      >
                        Journal
                      </button>
                      <button 
                        type="button"
                        onClick={() => setType("milestone")}
                        className={`flex-1 py-3 rounded-xl border text-[10px] uppercase tracking-widest font-black transition-all ${type === "milestone" ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-transparent border-white/5 text-white/20 hover:border-white/10"}`}
                      >
                        Milestone
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 ml-1 font-bold">Whisper your thoughts</label>
                    <textarea 
                      required
                      rows={4}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write something beautiful..."
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-all resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={saving}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl py-4 text-xs tracking-[0.3em] uppercase font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Preserve Memory</>}
                  </button>
                </form>
              </GlassContainer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
