"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import * as cc from "../lib/crypto-client";
import api from "../lib/api";

export type CryptoStatus = "init" | "locked" | "ready" | "waiting";
// init    = still figuring out state
// locked  = needs password / recovery code to derive idPriv
// ready   = CK available, can encrypt/decrypt
// waiting = unlocked but partner (creator) hasn't shared CK yet

interface CryptoContextType {
  status: CryptoStatus;
  error: string | null;
  unlock: (password: string) => Promise<void>;
  restore: (code: string) => Promise<void>;
  setupIdentity: (password: string) => Promise<string>;
  refreshCK: () => Promise<void>;
}

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<CryptoStatus>("init");
  const [error, setError] = useState<string | null>(null);
  const isCreatorRef = useRef<boolean | null>(null);

  const resolveIsCreator = useCallback(async (): Promise<boolean> => {
    if (isCreatorRef.current !== null) return isCreatorRef.current;
    try {
      const { data } = await api.get("/relationships/me");
      const creatorId = data?.user1Id?._id ?? data?.user1Id;
      isCreatorRef.current = String(creatorId) === String(user?._id);
    } catch {
      isCreatorRef.current = false;
    }
    return isCreatorRef.current;
  }, [user?._id]);

  const tryEnsure = useCallback(async () => {
    if (!user?._id || !user.relationshipId) return;
    const isCreator = await resolveIsCreator();
    try {
      const ok = await cc.ensureCK(user._id, isCreator);
      if (ok) setStatus("ready");
      else setStatus(cc.isUnlocked() ? "waiting" : "locked");
    } catch {
      setStatus("locked");
    }
  }, [user?._id, user?.relationshipId, resolveIsCreator]);

  // Initial attempt: device fast-path needs no password.
  useEffect(() => {
    if (!user?._id) {
      setStatus("init");
      return;
    }
    if (!user.relationshipId) {
      // No relationship yet (onboarding). Nothing to decrypt.
      setStatus("ready");
      return;
    }
    tryEnsure();
  }, [user?._id, user?.relationshipId, tryEnsure]);

  // Keep keys flowing without manual reloads:
  //  - Bob ("waiting"): poll until the creator seals CK to him.
  //  - Alice (creator, "ready"): re-distribute periodically so a partner/device
  //    that joins after she opened the chat still receives the CK.
  useEffect(() => {
    if (!user?.relationshipId) return;
    if (status !== "waiting" && !(status === "ready" && isCreatorRef.current)) return;
    const everyMs = status === "waiting" ? 4000 : 9000;
    const id = setInterval(() => { tryEnsure(); }, everyMs);
    return () => clearInterval(id);
  }, [status, user?.relationshipId, tryEnsure]);

  const unlock = useCallback(async (password: string) => {
    if (!user?._id) return;
    setError(null);
    try {
      await cc.unlockWithPassword(user._id, password);
      await tryEnsure();
    } catch (e: any) {
      setError("Wrong password, or no keys on this account.");
      throw e;
    }
  }, [user?._id, tryEnsure]);

  const restore = useCallback(async (code: string) => {
    if (!user?._id) return;
    setError(null);
    try {
      await cc.unlockWithRecoveryCode(user._id, code);
      await tryEnsure();
    } catch (e: any) {
      setError("Invalid recovery code.");
      throw e;
    }
  }, [user?._id, tryEnsure]);

  const setupIdentity = useCallback(async (password: string): Promise<string> => {
    if (!user?._id) throw new Error("Not signed in");
    const { recoveryCode } = await cc.setupNewIdentity(user._id, password);
    await tryEnsure();
    return recoveryCode;
  }, [user?._id, tryEnsure]);

  const value: CryptoContextType = {
    status,
    error,
    unlock,
    restore,
    setupIdentity,
    refreshCK: tryEnsure,
  };

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
};

export const useCrypto = () => {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error("useCrypto must be used within CryptoProvider");
  return ctx;
};
