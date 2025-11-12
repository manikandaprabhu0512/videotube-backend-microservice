import { ApiError } from "../utils/ApiErrors.js";
import asyncHandler from "../utils/asyncHandler.js";
import axios from "axios";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) throw new ApiError(401, "Token Expired");

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await axios.get(
      `${process.env.BASE_URL}/c/${decodedToken.username}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!user) throw new ApiError(401, "User does Not Exist. Invalid Action");

    req.user = user.data.data;
    req.user.authorization = token;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token Expired" });
    }
    console.log("Error", error.message);

    throw new ApiError(401, "Invalid User");
  }
});
