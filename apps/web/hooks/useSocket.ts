import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useChatStore } from "../store/useChatStore";
import { usePresenceStore } from "../store/usePresenceStore";

export const useSocket = (authenticated: boolean) => {
  const socketRef = useRef<Socket | null>(null);
  const { addMessage, updateMessage, removeMessage, setMessageFailed, setTyping, setCurrentUserId, markAllSeen } = useChatStore();
  const { setPartnerStatus, setCurrentVibe } = usePresenceStore();

  useEffect(() => {
    if (!authenticated) return;

    // Cookie (HttpOnly auth_token) is sent automatically via withCredentials
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4005", {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("heartbeat");
    });

    socket.on("authenticated", ({ userId }) => {
      setCurrentUserId(userId);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket Connection Error:", err.message);
    });

    socket.on("receive_message", (message) => {
      addMessage(message);
    });

    socket.on("message_updated", (message) => {
      updateMessage(message.clientGeneratedId, message);
    });

    socket.on("user_typing", ({ isTyping, name }) => {
      setTyping(isTyping, name);
    });

    socket.on("presence_update", ({ status }) => {
      setPartnerStatus(status);
    });

    socket.on("mood_changed", ({ mood, intensity }) => {
      setCurrentVibe(mood, intensity);
    });

    socket.on("all_messages_seen", ({ seenAt }) => {
      markAllSeen(seenAt);
    });

    socket.on("messages_seen_bulk", ({ messageIds, seenAt }: { messageIds: string[]; seenAt: string }) => {
      messageIds.forEach((id) => updateMessage(id, { status: { seenAt } } as any));
    });

    const heartbeatInterval = setInterval(() => {
      socket.emit("heartbeat");
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [authenticated, addMessage, updateMessage, removeMessage, setMessageFailed, setTyping, setPartnerStatus, setCurrentVibe, setCurrentUserId, markAllSeen]);

  const sendMessage = (content: string, clientGeneratedId: string, type: string = "text", mediaUrl?: string, replyTo?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit(
      "send_message",
      { content, clientGeneratedId, type, mediaUrl, replyTo },
      (response: { ok?: boolean; error?: string }) => {
        if (response?.error) {
          // Mark as failed so ChatBubble shows inline error; don't silently drop
          setMessageFailed(clientGeneratedId);
        }
      }
    );
  };

  const retryMessage = useCallback((msg: { content: string; clientGeneratedId: string; type: string; mediaUrl?: string; replyTo?: string }) => {
    if (!socketRef.current) return;
    // Reset failed state then re-emit
    useChatStore.getState().updateMessage(msg.clientGeneratedId, { failed: false, isOptimistic: true });
    sendMessage(msg.content, msg.clientGeneratedId, msg.type, msg.mediaUrl, msg.replyTo);
  }, []);

  const sendTyping = (isTyping: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit(isTyping ? "typing_start" : "typing_stop");
    }
  };

  const pendingSeenRef = useRef<Set<string>>(new Set());
  const seenFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markAsSeen = useCallback((messageId: string) => {
    pendingSeenRef.current.add(messageId);
    if (seenFlushTimer.current) clearTimeout(seenFlushTimer.current);
    seenFlushTimer.current = setTimeout(() => {
      if (!socketRef.current || pendingSeenRef.current.size === 0) return;
      socketRef.current.emit("messages_seen_batch", { messageIds: Array.from(pendingSeenRef.current) });
      pendingSeenRef.current.clear();
    }, 300);
  }, []);

  const markAllAsSeen = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("mark_all_seen");
    }
  }, []);

  return { sendMessage, sendTyping, markAsSeen, markAllAsSeen, retryMessage };
};
