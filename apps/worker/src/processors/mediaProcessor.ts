import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const processMedia = async (jobData: any) => {
  const { fileKey, type } = jobData;

  if (type !== "image") {
    return;
  }

  try {
    // Cloudinary handles transformations automatically via URLs, 
    // but we can pre-generate them or optimize here if needed.
    // For now, we'll just log that it's being "managed".
    console.log(`Cloudinary managing media for ${fileKey}`);
    
    // Example: Triggering a transformation/optimization explicitly
    await cloudinary.uploader.explicit(fileKey, {
      type: "upload",
      eager: [
        { width: 200, height: 200, crop: "thumb", gravity: "face" },
        { width: 20, height: 20, crop: "fill", effect: "blur:1000" }
      ]
    });

  } catch (err: any) {
    console.error(`Cloudinary processing failed for ${fileKey}:`, err);
    throw err;
  }
};
