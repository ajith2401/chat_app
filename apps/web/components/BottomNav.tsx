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
    <nav className="fixed bottom-10 z-50 pointer-events-none w-full flex justify-center px-4">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-1 p-2 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-[60px] bg-black/60 pointer-events-auto max-w-md w-full sm:w-auto"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={cn(
                "flex-1 sm:flex-none flex flex-col items-center gap-1.5 px-6 sm:px-8 py-3 rounded-2xl transition-all duration-300 relative group",
                isActive ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100")} />
              <span className={cn(
                "text-[9px] uppercase tracking-[0.2em] font-black",
                isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="nav-active"
                  className="absolute inset-0 bg-white/10 rounded-2xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                />
              )}
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
};
