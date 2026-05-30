import { create } from "zustand";
import api from "../lib/api";

export interface Message {
  _id: string;
  relationshipId: string;
  senderId: string;
  clientGeneratedId: string;
  content: string;
  type: string;
  mediaUrl?: string;
  replyTo?: Message | null;
  status: {
    sentAt: string;
    deliveredAt?: string;
    seenAt?: string;
  };
  createdAt: string;
  isOptimistic?: boolean;
  failed?: boolean;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  typingUserName: string | null;
  currentUserId: string | null;
  hasMore: boolean;
  isLoadingHistory: boolean;
  addMessage: (message: Message) => void;
  updateMessage: (clientGeneratedId: string, updates: Partial<Message>) => void;
  removeMessage: (clientGeneratedId: string) => void;
  setMessageFailed: (clientGeneratedId: string) => void;
  markAllSeen: (seenAt: string) => void;
  setMessages: (messages: Message[]) => void;
  setTyping: (isTyping: boolean, name?: string | null) => void;
  setCurrentUserId: (id: string | null) => void;
  fetchMessages: () => Promise<void>;
  fetchMoreMessages: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isTyping: false,
  typingUserName: null,
  currentUserId: null,
  hasMore: true,
  isLoadingHistory: false,
  addMessage: (message) =>
    set((state) => {
      const exists = state.messages.some(
        (m) => m._id === message._id || m.clientGeneratedId === message.clientGeneratedId
      );
      if (exists) return state;
      return { messages: [message, ...state.messages] };
    }),
  updateMessage: (clientGeneratedId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.clientGeneratedId === clientGeneratedId ? { ...m, ...updates } : m
      ),
    })),
  removeMessage: (clientGeneratedId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.clientGeneratedId !== clientGeneratedId),
    })),
  setMessageFailed: (clientGeneratedId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.clientGeneratedId === clientGeneratedId ? { ...m, failed: true, isOptimistic: false } : m
      ),
    })),
  markAllSeen: (seenAt) =>
    set((state) => {
      const currentUserId = state.currentUserId;
      return {
        messages: state.messages.map((m) =>
          m.senderId !== currentUserId && !m.status.seenAt
            ? { ...m, status: { ...m.status, seenAt } }
            : m
        ),
      };
    }),
  setMessages: (messages) => set({ messages }),
  setTyping: (isTyping, name = null) => set({ isTyping, typingUserName: name }),
  setCurrentUserId: (id) => set({ currentUserId: id }),
  fetchMessages: async () => {
    set({ isLoadingHistory: true });
    try {
      const res = await api.get("/messages?limit=50");
      set({ 
        messages: res.data, 
        hasMore: res.data.length === 50,
        isLoadingHistory: false 
      });
    } catch (err) {
      console.error("Failed to fetch messages", err);
      set({ isLoadingHistory: false });
    }
  },
  fetchMoreMessages: async () => {
    const { messages, hasMore, isLoadingHistory } = get();
    if (!hasMore || isLoadingHistory || messages.length === 0) return;

    set({ isLoadingHistory: true });
    const lastMessage = messages[messages.length - 1];
    try {
      const res = await api.get(`/messages?limit=50&before=${lastMessage.createdAt}`);
      set({ 
        messages: [...messages, ...res.data], 
        hasMore: res.data.length === 50,
        isLoadingHistory: false 
      });
    } catch (err) {
      console.error("Failed to fetch more messages", err);
      set({ isLoadingHistory: false });
    }
  },
}));
