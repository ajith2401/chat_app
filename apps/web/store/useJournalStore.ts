import { create } from "zustand";
import api from "../lib/api";

export interface JournalEntry {
  _id: string;
  relationshipId: string;
  authorId: string;
  title: string;
  content: string;
  type: "journal" | "milestone";
  moodTag?: string;
  date: string;
  createdAt: string;
}

interface JournalState {
  entries: JournalEntry[];
  loading: boolean;
  fetchEntries: () => Promise<void>;
  addEntry: (entry: Partial<JournalEntry>) => Promise<void>;
}

export const useJournalStore = create<JournalState>((set) => ({
  entries: [],
  loading: false,
  fetchEntries: async () => {
    set({ loading: true });
    try {
      const res = await api.get("/journals");
      set({ entries: res.data, loading: false });
    } catch (err) {
      console.error("Failed to fetch journal entries", err);
      set({ loading: false });
    }
  },
  addEntry: async (entry) => {
    try {
      const res = await api.post("/journals", entry);
      set((state) => ({ entries: [res.data, ...state.entries] }));
    } catch (err) {
      console.error("Failed to add journal entry", err);
      throw err;
    }
  },
}));
