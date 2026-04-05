import { v2 as cloudinary } from "cloudinary";
import {
  fetchAvatarUrlByUserId,
  fetchUserProfileData,
  UpdateUserProfileData,
} from "#shared/services/userProfileQueries.js";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER_MAP = {
  avatar: "vorn_avatars",
  banner: "vorn_banners",
};

export const getUserAvatarController = async (req, res) => {
  const { userId } = req.user;
  const data = await fetchAvatarUrlByUserId(userId, true);
  if (!data.avatar_url) {
    // we didnt check the display name cuz its always there (on first signup its the same as username)
    return res.status(404).json({
      status: "error",
      message: "Avatar not found.",
    });
  }
  return res.status(200).json({
    status: "success",
    data: { avatar_url: data.avatar_url, display_name: data.display_name },
  });
};

export const getProfileDataController = async (req, res) => {
  const { userId } = req.user; // From your auth middleware
  const data = await fetchUserProfileData(userId);
  if (!data) {
    console.log("No profile data found for user ID: ", userId);
    return res.status(404).json({
      status: "error",
      message: "Profile data not found.",
    });
  }
  return res.status(200).json({
    status: "success",
    data: data,
  });
};
// update the profile data of the user
export const updateProfileDataController = async (req, res) => {
  try {
    const { userId } = req.user;

    // We start with the body (username, bio, location, profile_readme, etc.)
    const updateFields = { ...req.body };

    // Handle the avatar file specifically
    if (req.file) {
      updateFields.avatar_url = req.file.path;

      // Background cleanup for old avatar (don't await)
      fetchAvatarUrlByUserId(userId).then((userResult) => {
        const oldAvatarUrl = userResult?.avatar_url;
        if (oldAvatarUrl) {
          const publicId = oldAvatarUrl
            .split("/")
            .slice(-2)
            .join("/")
            .split(".")[0];
          cloudinary.uploader
            .destroy(publicId)
            .catch((err) => console.error(err));
        }
      });
    }

    // Call the dynamic service
    const user = await UpdateUserProfileData(userId, updateFields);

    res.status(200).json({
      message: "Profile updated successfully",
      user: user,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const cloudinarySignatureController = (req, res) => {
  const type = req.query.type === "banner" ? "banner" : "avatar";
  const folder = FOLDER_MAP[type];
  const timestamp = Math.round(Date.now() / 1000);
  const userId = req.user?.userId || "unknown";

  //  Params that MUST match exactly what the frontend sends in FormData
  // Cloudinary rejects uploads if the signed params differ from the actual ones.
  const paramsToSign = {
    timestamp,
    folder,
    tags: `user_${userId},${type}`,
    // Server-side eager transform Cloudinary generates a compressed variant
    eager:
      type === "avatar"
        ? "c_fill,w_400,h_400,q_auto,f_auto"
        : "c_fill,w_1500,h_500,q_auto,f_auto",
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET,
  );

  return res.json({
    signature,
    timestamp,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    tags: paramsToSign.tags,
    eager: paramsToSign.eager,
  });
};
