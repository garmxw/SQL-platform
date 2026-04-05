// import { v2 as cloudinary } from "cloudinary";
// import { CloudinaryStorage } from "multer-storage-cloudinary";
// import multer from "multer";
// import dotenv from "dotenv";
// dotenv.config();

// // 1. Setup Cloudinary Config
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // 2. Setup Storage Engine
// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: {
//     folder: "vorn_avatars", // The folder name in Cloudinary
//     allowed_formats: ["jpg", "png", "gif"], // Restrict formats
//     //transformation: [{ width: 500, height: 500, crop: "limit" }], // this going to do it in the front using this: const displayUrl = user.avatar_url.replace('/upload/', '/upload/w_500,h_500,c_limit/')
//     // Optional: auto-resize
//   },
// });

// // 3. Setup Multer with validation
// export const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 3 * 1024 * 1024, // 3MB Limit
//   },
// });
