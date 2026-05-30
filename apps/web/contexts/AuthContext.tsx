"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import api from "../lib/api";
import { useRouter, usePathname } from "next/navigation";

interface User {
  _id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  relationshipId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (err: any) {
      // Clear the stale/revoked cookie so the user gets a clean login page
      if (err.response?.status === 401) {
        api.post("/auth/logout").catch(() => {});
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Simplified route protection
  useEffect(() => {
    if (loading) return;

    const publicRoutes = ["/", "/login", "/signup"];
    const isPublic = publicRoutes.includes(pathname);

    if (!user && !isPublic) {
      router.push("/login");
    } else if (user && !user.relationshipId && !isPublic && pathname !== "/onboarding") {
      router.push("/onboarding");
    }
  }, [user, loading, pathname, router]);

  const value = useMemo(() => ({
    user,
    loading,
    login: (_token: string, userData: User) => {
      // Token is already set as HttpOnly cookie by the server response
      setUser(userData);
      if (userData.relationshipId) {
        router.push("/chat");
      } else {
        router.push("/onboarding");
      }
    },
    logout: async () => {
      try { await api.post("/auth/logout"); } catch { /* ignore */ }
      setUser(null);
      router.push("/login");
    },
    refreshUser,
  }), [user, loading, router]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a fallback or throw a more descriptive error
    throw new Error("useAuth hook was called outside of an AuthProvider. Ensure that your component is wrapped in <Providers> in the root layout.");
  }
  return context;
};
