"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AmbientBackground } from "../../components/AmbientBackground";
import { GlassContainer } from "../../components/GlassContainer";
import { motion } from "framer-motion";
import { Heart, Camera, MessageCircle, Sparkles } from "lucide-react";
import { BottomNav } from "../../components/BottomNav";
import { usePresenceStore } from "../../store/usePresenceStore";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import { Skeleton } from "../../components/Skeleton";

interface Milestone {
  _id: string;
  title: string;
  date: string;
  type: string;
}

export default function TimelinePage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

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
    const fetchMilestones = async () => {
      try {
        const res = await api.get("/journals?type=milestone");
        setMilestones(res.data);
      } catch (err) {
        console.error("Failed to fetch milestones", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMilestones();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "photo": return Camera;
      case "message": return MessageCircle;
      default: return Heart;
    }
  };

  if (authLoading) return null;

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-start p-4 md:p-8 overflow-y-auto bg-[#050505] scrollbar-hide font-sans">
      <AmbientBackground />
      
      <div className="w-full max-w-4xl flex flex-col gap-16 mb-40 mt-16">
        <header className="text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-serif text-white/90 italic tracking-tighter"
          >
            Our Story
          </motion.h1>
          <p className="text-[10px] text-white/20 uppercase tracking-[0.5em] mt-6 font-black">Every moment led us here</p>
        </header>

        {loading ? (
          <div className="flex flex-col gap-24 py-10 items-center">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="w-64 h-32 rounded-[2.5rem]" />
            ))}
          </div>
        ) : milestones.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center opacity-30"
          >
            <Sparkles className="w-16 h-16 mb-6 stroke-[1px]" />
            <h3 className="font-serif text-2xl italic">The first chapter is waiting.</h3>
            <p className="text-xs uppercase tracking-[0.3em] mt-4 font-bold">Mark your first milestone in the journal</p>
          </motion.div>
        ) : (
          <div className="relative flex flex-col gap-24 before:absolute before:left-1/2 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {milestones.map((event, index) => {
              const Icon = getIcon(event.type);
              return (
                <motion.div 
                  key={event._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex items-center gap-12 ${index % 2 === 0 ? "flex-row text-right" : "flex-row-reverse text-left"}`}
                >
                  <div className="flex-1 hidden md:block" />
                  
                  <div className="relative z-10 w-16 h-16 rounded-full bg-neutral-950 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)] group">
                    <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-125 blur-xl" />
                    <Icon className="w-6 h-6 text-white/40 relative z-10 group-hover:text-white transition-colors" />
                  </div>

                  <GlassContainer 
                    className="flex-1 p-8 hover:border-white/20 transition-all duration-700 cursor-pointer"
                    intensity="medium"
                    interactive
                  >
                    <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">
                      {new Date(event.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                    <h3 className="text-2xl font-serif text-white/90 mt-2 tracking-tight">{event.title}</h3>
                  </GlassContainer>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
