const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
};

const optional = (key: string, fallback: string): string =>
  process.env[key] || fallback;

export const env = {
  JWT_SECRET:              required("JWT_SECRET"),
  CLOUDINARY_CLOUD_NAME:   required("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY:      required("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET:   required("CLOUDINARY_API_SECRET"),
  OPENAI_API_KEY:          required("OPENAI_API_KEY"),
  MONGODB_URI:             required("MONGODB_URI"),
  REDIS_URL:               required("REDIS_URL"),
  CLIENT_URL:              optional("CLIENT_URL", "http://localhost:3000"),
  NODE_ENV:                optional("NODE_ENV", "development"),
  PORT:                    optional("PORT", "4000"),
};
