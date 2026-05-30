"use client";

import { ReactNode } from "react";
import type { TargetAndTransition } from "framer-motion";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassContainerProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  intensity?: "low" | "medium" | "high";
  interactive?: boolean;
  exit?: TargetAndTransition;
}

export const GlassContainer = ({
  children,
  className,
  animate = true,
  intensity = "medium",
  interactive = false,
  exit: exitProp,
}: GlassContainerProps) => {
  const Component = animate ? motion.div : "div";

  const intensityClasses = {
    low:    "backdrop-blur-md bg-white/[0.02] border-white/5",
    medium: "backdrop-blur-2xl bg-white/[0.04] border-white/10",
    high:   "backdrop-blur-[80px] bg-white/[0.07] border-white/15",
  };

  return (
    <Component
      initial={animate ? { opacity: 0, y: 15, scale: 0.99 } : undefined}
      animate={animate ? { opacity: 1, y: 0, scale: 1 } : undefined}
      exit={animate ? (exitProp ?? { opacity: 0, scale: 0.96, y: -10 }) : undefined}
      whileHover={interactive ? { scale: 1.01 } : undefined}
      transition={{
        default: { duration: 0.8, ease: [0.19, 1, 0.22, 1] },
        scale: interactive ? { type: "spring", stiffness: 400, damping: 30 } : undefined,
      }}
      className={cn(
        "relative rounded-[2.5rem] border overflow-hidden",
        "shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
        intensityClasses[intensity],
        // Refined inner glow
        "after:absolute after:inset-0 after:rounded-[2.5rem] after:pointer-events-none after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]",
        className
      )}
    >
      {/* Glossy highlight line at the top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      
      {children}
    </Component>
  );
};
