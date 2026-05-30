import mongoose from "mongoose";
import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/couple-chat"
    );
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err: any) {
    logger.error(`Error: ${err.message}`);
    process.exit(1);
  }
};
