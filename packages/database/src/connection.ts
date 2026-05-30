import mongoose from "mongoose";

export const connectDB = async (uri?: string) => {
  const mongoUri = uri || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI environment variable is not set");

  if (mongoose.connection.readyState >= 1) return;

  await mongoose.connect(mongoUri);
};
