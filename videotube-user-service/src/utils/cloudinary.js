import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudindary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath); //removes the locally stored file;
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //removes the locally stored file;

    return null;
  }
};

const destroyOnCloudinary = async (public_id) => {
  try {
    if (!public_id) return null;
    const response = await cloudinary.uploader.destroy(public_id, {
      resource_type: "image",
    });

    return response;
  } catch (error) {
    return null;
  }
};

const destroyVideoOnCloudinary = async (public_id) => {
  try {
    if (!public_id) return null;
    const response = await cloudinary.uploader.destroy(public_id, {
      resource_type: "video",
    });
    // console.log("Cloudinary Response:", response);

    return response;
  } catch (error) {
    // console.error("Cloundinary Upload Error: ", error);

    return null;
  }
};

export { uploadOnCloudindary, destroyOnCloudinary, destroyVideoOnCloudinary };
