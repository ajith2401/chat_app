export { connectDB } from "./connection";
export { default as User } from "./models/User";
export { default as Message } from "./models/Message";
export { default as MessageEmbedding } from "./models/MessageEmbedding";
export { default as Relationship } from "./models/Relationship";
export { default as JournalEntry } from "./models/JournalEntry";

export type { IUser } from "./models/User";
export type { IMessage } from "./models/Message";
export type { IMessageEmbedding } from "./models/MessageEmbedding";
export type { IRelationship } from "./models/Relationship";
