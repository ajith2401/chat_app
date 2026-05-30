import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getUploadSignature = (folder: string) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const params = {
    timestamp,
    folder,
    allowed_formats: "jpg,jpeg,png,gif,webp",
    max_bytes: 10_485_760, // 10 MB
    resource_type: "image",
  };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);

  return { timestamp, signature, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME, ...params };
};

export const getSecureUrl = (publicId: string, options: any = {}) => {
  return cloudinary.url(publicId, {
    secure: true,
    ...options,
  });
};
