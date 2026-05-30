import { JournalEntry } from "@couple-chat/database";

export const getEntries = async (relationshipId: string, filter: any = {}) => {
  const query = { relationshipId, deletedAt: { $exists: false }, ...filter };
  return await JournalEntry.find(query)
    .sort({ date: -1 });
};

export const createEntry = async (data: {
  relationshipId: string;
  authorId: string;
  title: string;
  content: string;
  type: string;
  moodTag?: string;
}) => {
  const entry = new JournalEntry(data);
  return await entry.save();
};
