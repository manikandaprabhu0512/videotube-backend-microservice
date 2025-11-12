// import dotenv from "dotenv";
// dotenv.config({ path: "./.env" });
import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
  .then(
    app.listen(process.env.PORT || 8002, () => {
      console.log(`Server Running on Port ${process.env.PORT}`);
    })
  )
  .catch((err) => {
    console.log("Mongo DB Connection Error: ", err);
  });

/*
import express from "express";
const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("ERRR", (error) => {
      console.log("Error: ", error);
      throw error;
    });
    app.listen(process.env.PORT, () => {
      console.log(`Process running on Port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log("ERR: ", error);
    throw error;
  }
})();
*/
