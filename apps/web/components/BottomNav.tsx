"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Book, Calendar, User } from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/journal", label: "Journal", icon: Book },
  { href: "/timeline", label: "Story", icon: Calendar },
  { href: "/settings", label: "Us", icon: User },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-6 z-[100] pointer-events-none w-full flex justify-center px-4">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="flex items-center gap-1 p-1.5 rounded-[1.75rem] border border-white/[0.14] shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-2xl bg-neutral-900/85 pointer-events-auto"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-5 sm:px-7 py-2.5 rounded-[1.25rem] transition-all duration-200 relative group select-none",
                isActive ? "text-white" : "text-white/40 hover:text-white/70"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-[1.25rem] bg-white/[0.1] border border-white/[0.08]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className={cn("w-[18px] h-[18px] relative z-10 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-105")} />
              <span className={cn(
                "text-[8px] uppercase tracking-[0.18em] font-black relative z-10",
                isActive ? "text-white" : "text-white/40 group-hover:text-white/60"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
};
