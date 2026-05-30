import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "../store/useChatStore";

describe("useChatStore", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: [], isTyping: false, currentUserId: null });
  });

  it("should add a message to the store", () => {
    const newMessage = {
      _id: "1",
      relationshipId: "rel1",
      senderId: "user1",
      clientGeneratedId: "uuid-1",
      content: "Hello",
      type: "text",
      status: { sentAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    };

    useChatStore.getState().addMessage(newMessage);
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe("Hello");
  });

  it("should not add duplicate messages", () => {
    const msg = {
      _id: "1",
      clientGeneratedId: "uuid-1",
      content: "Hi",
      relationshipId: "r1",
      senderId: "s1",
      type: "text",
      status: { sentAt: "..." },
      createdAt: "...",
    };

    useChatStore.getState().addMessage(msg);
    useChatStore.getState().addMessage(msg);
    expect(useChatStore.getState().messages).toHaveLength(1);
  });
});
