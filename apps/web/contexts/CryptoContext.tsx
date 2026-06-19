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

  const tryEnsure = useCallback(async () => {
    if (!user?._id || !user.relationshipId) { setStatus("ready"); return; }

    // One fetch tells us status + who the creator is. /relationships/me is NOT
    // guarded, so it works while pending too.
    let rel: any = null;
    try { rel = (await api.get("/relationships/me")).data; } catch { /* keep prior state */ return; }

    const creatorId = rel?.user1Id?._id ?? rel?.user1Id;
    if (creatorId) isCreatorRef.current = String(creatorId) === String(user._id);

    // Pending = no partner yet. There's nothing to decrypt, and the key-share
    // endpoints are (correctly) guarded to active relationships — so do NOT run
    // any crypto here. The chat page shows the invite/connect screen instead.
    if (rel?.status !== "active") { setStatus("ready"); return; }

    try {
      const ok = await cc.ensureCK(user._id, isCreatorRef.current === true);
      if (ok) setStatus("ready");
      else setStatus(cc.isUnlocked() ? "waiting" : "locked");
    } catch {
      setStatus("locked");
    }
  }, [user?._id, user?.relationshipId]);

  // Initial attempt: device fast-path needs no password.
  useEffect(() => {
    if (!user?._id) { setStatus("init"); return; }
    if (!user.relationshipId) { setStatus("ready"); return; } // onboarding — nothing to decrypt
    tryEnsure();
  }, [user?._id, user?.relationshipId, tryEnsure]);

  // Keep keys flowing without manual reloads:
  //  - "init": a /relationships/me failure (e.g. server briefly unreachable)
  //    leaves us here; keep retrying so we recover automatically once it's back.
  //  - joiner ("waiting"): poll until the creator seals CK to them.
  //  - creator ("ready"): re-check so that when the partner joins (active) we
  //    mint + distribute CK, and re-distribute to late devices.
  useEffect(() => {
    if (!user?.relationshipId) return;
    const shouldPoll = status === "init" || status === "waiting" || (status === "ready" && isCreatorRef.current === true);
    if (!shouldPoll) return;
    const everyMs = status === "init" ? 3000 : status === "waiting" ? 4000 : 9000;
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
