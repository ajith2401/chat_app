import { create } from "zustand";
import api from "../lib/api";

interface PresenceState {
  partnerStatus: string;
  currentVibe: string;
  currentIntensity: number;
  partnerName: string | null;
  partnerAvatar: string | null;
  relationshipStatus: "pending" | "active" | null;
  setPartnerStatus: (status: string) => void;
  setCurrentVibe: (mood: string, intensity?: number) => void;
  fetchRelationship: (currentUserId: string) => Promise<void>;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  partnerStatus: "offline",
  currentVibe: "neutral",
  currentIntensity: 0.5,
  partnerName: null,
  partnerAvatar: null,
  relationshipStatus: null,
  setPartnerStatus: (status) => set({ partnerStatus: status }),
  setCurrentVibe: (mood, intensity = 0.5) => set({ currentVibe: mood, currentIntensity: intensity }),
  fetchRelationship: async (currentUserId) => {
    try {
      const res = await api.get("/relationships/me");
      const rel = res.data;
      if (!rel) { set({ relationshipStatus: "pending" }); return; }
      const partner = rel.user1Id?._id === currentUserId ? rel.user2Id : rel.user1Id;
      set({
        relationshipStatus: rel.status,
        partnerName: partner?.name || "Partner",
        partnerAvatar: partner?.avatarUrl || null,
        partnerStatus: partner?.presenceStatus || "offline",
        currentVibe: rel.currentMood || "neutral",
        currentIntensity: rel.lastEmotionIntensity ?? 0.5,
      });
    } catch (err: any) {
      // A 403 from the (guarded) endpoint means the relationship exists but isn't
      // active yet = pending. Treat it as pending so the UI shows the connect
      // screen instead of hanging — works even if the backend isn't updated.
      if (err?.response?.status === 403) set({ relationshipStatus: "pending" });
    }
  },
}));
