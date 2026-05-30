"use client";

import Link from "next/link";
import { AmbientBackground } from "../components/AmbientBackground";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center p-6 md:p-24 overflow-hidden relative">
      <AmbientBackground />
      
      <div className="z-10 w-full max-w-5xl flex flex-col items-center text-center gap-8">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-serif text-white/90 tracking-tight"
        >
          A Space for Us.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="max-w-xl text-white/40 text-sm md:text-base leading-relaxed font-light tracking-wide"
        >
          A premium, private space designed exclusively for your relationship. 
          Capture memories, share moments, and grow closer in an emotionally immersive digital environment.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 mt-4"
        >
          <Link 
            href="/chat"
            className="px-10 py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-white text-sm tracking-widest uppercase transition-all backdrop-blur-md"
          >
            Get Started
          </Link>
          <Link 
            href="/login"
            className="px-10 py-4 hover:bg-white/5 text-white/60 hover:text-white rounded-2xl text-sm tracking-widest uppercase transition-all"
          >
            Sign In
          </Link>
        </motion.div>
      </div>

      {/* Decorative cinematic flares */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-rose-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px]" />
    </main>
  );
}
