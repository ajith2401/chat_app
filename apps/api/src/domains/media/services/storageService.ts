import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getUploadSignature = (folder: string) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  // Only sign params that will also be sent in the POST body.
  // resource_type is a URL path segment, not a body param, so it must NOT be signed.
  // allowed_formats/max_bytes are upload-preset concerns; enforce them client-side + in confirmUpload.
  const signParams = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(signParams, process.env.CLOUDINARY_API_SECRET!);

  return {
    timestamp,
    signature,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
};

export const getSecureUrl = (publicId: string, options: any = {}) => {
  return cloudinary.url(publicId, {
    secure: true,
    ...options,
  });
};
