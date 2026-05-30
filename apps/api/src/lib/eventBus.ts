import { EventEmitter } from "events";

class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
}

export const eventBus = EventBus.getInstance();

export const EVENTS = {
  MESSAGE: {
    CREATED: "message.created",
    READ: "message.read",
    REACTION: "message.reaction",
  },
  PRESENCE: {
    CHANGED: "presence.changed",
  },
  MOOD: {
    UPDATED: "mood.updated",
  },
  RELATIONSHIP: {
    CREATED: "relationship.created",
    JOINED: "relationship.joined",
    RECAP_GENERATED: "relationship.recap_generated",
  },
};
