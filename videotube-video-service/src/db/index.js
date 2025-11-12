import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    const conncectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB Connected!! DB HOST: ${conncectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("Error Connecting DB: ", error);
    process.exit(1);
  }
};

export default connectDB;
