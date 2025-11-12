import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../model/user.model.js";
import {
  destroyOnCloudinary,
  uploadOnCloudindary,
} from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cachedHMapService } from "../../../gateway/services/cacheService.js";
import client from "../../../gateway/services/redisClient.js";
import grpc from "@grpc/grpc-js";
import { video_protoclient } from "../../../proto/proto_controllers/video.proto.js";
import { userPackage } from "../../../proto/proto_controllers/user.proto.js";

const generateAccessandRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    await User.findByIdAndUpdate(
      userId,
      { $push: { refreshToken } },
      { new: true, validateBeforeSave: false }
    );

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something Went Wrong");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullName, biography } = req.body;

  if (
    [username, email, password, fullName, biography].some(
      (field) => field?.trim() === ""
    )
  )
    throw new ApiError(400, "All Fields are required");

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) throw new ApiError(409, "User already exists");

  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files?.avatar[0].path;
  }

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  const avatar = await uploadOnCloudindary(avatarLocalPath);

  const coverImage = await uploadOnCloudindary(coverImageLocalPath);

  const user = await User.create({
    username: username.toLowerCase(),
    password,
    email,
    fullName,
    biography,
    avatar: {
      url: avatar?.url || "",
      public_id: avatar?.public_id || "",
    },
    coverImage: {
      url: coverImage?.url || "",
      public_id: coverImage?.public_id || "",
    },
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res, next) => {
  const { username, email, password } = req.body;
  if (!(username || email)) throw new ApiError(400, "Requires Crendentials");

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) throw new ApiError(404, "User not found");

  const validatePassword = await user.isPasswordCorrect(password);

  if (!validatePassword)
    return res.status(401).json({ message: "Invalid Password" });

  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(
    user._id
  );

  console.log(accessToken);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInUser, "User Logged in Successfully"));
});

const logoutUser = asyncHandler(async (req, res, next) => {
  try {
    const presentRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    const userKey = `user:${req?.user._id}`;

    const cached = await cachedHMapService.getAll(userKey);

    if (cached) {
      await client.del(userKey);
    }

    if (!presentRefreshToken) throw new ApiError(401, "Unauthorized Request");

    await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { refreshToken: presentRefreshToken },
      },
      { new: true }
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "Logged Out Successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Something Went wrong");
  }
});

const refreshAcessToken = asyncHandler(async (req, res, next) => {
  try {
    const presentRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!presentRefreshToken) throw new ApiError(401, "Unauthorized Request");

    const decodedToken = jwt.verify(
      presentRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);

    if (!user) throw new ApiError(401, "Invalid User");

    if (
      !user.refreshToken ||
      !user.refreshToken.includes(presentRefreshToken)
    ) {
      throw new ApiError(401, "User does not exist or invalid action");
    }

    const { accessToken, refreshToken } = await generateAccessandRefreshTokens(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, {}, "RefreshToken Generated Successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Something Went wrong");
  }
});

const changeUserPassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  if (!user) throw new ApiError(400, "Invalid Action");

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(401, "Invalid Password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not logged in" });

  const userKey = `user:${req.user._id}`;

  const cached = await cachedHMapService.getAll(userKey);

  if (cached) {
    return res
      .status(200)
      .json(new ApiResponse(200, cached, "User Fetched SuccessFully"));
  }

  const hashData = {
    _id: req.user._id,
    username: req.user.username.toLowerCase(),
    fullName: req.user.fullName,
    email: req.user.email,
    biography: req.user.biography,
    avatar: req.user.avatar ? req.user.avatar : "",
    coverImage: req.user.coverImage ? req.user.coverImage : "",
    watchHistory: req.user.watchHistory ? req.user.watchHistory : [],
  };

  for (const [field, value] of Object.entries(hashData)) {
    await cachedHMapService.set(userKey, field, value);
  }

  res
    .status(200)
    .json(new ApiResponse(200, req.user, "User Fetched SuccessFully"));
});

const updateAccountDetails = asyncHandler(async (req, res, next) => {
  const { fullName, email, username, biography } = req.body;

  if (!(fullName || email || username || biography))
    throw new ApiError(400, "Credential are Required");

  const userKey = `user:${req.user._id}`;

  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );

  const dbEmail = await User.findOne({ email });
  if (dbEmail) throw new ApiError(409, "Email Already exists");

  const dbUsername = await User.findOne({ username });
  if (dbUsername) throw new ApiError(409, "Username Already exists");

  if (fullName) {
    user.fullName = fullName;
    await cachedHMapService.set(userKey, "fullName", fullName);
  }
  if (email) {
    user.email = email;
    await cachedHMapService.set(userKey, "email", email);
  }
  if (username) {
    user.username = username;
    await cachedHMapService.set(userKey, "username", username.toLowerCase());
  }
  if (biography) {
    user.biography = biography;
    await cachedHMapService.set(userKey, "biography", biography);
  }
  await user.save({ validateBeforeSave: false });

  return res
    .status(201)
    .json(new ApiResponse(200, user, "Fields Changed Successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatar = req.file?.path;

  if (!avatar) throw new ApiError(401, "Avatar is Missing");

  const avatarFile = await uploadOnCloudindary(avatar);

  const userKey = `user:${req.user._id}`;

  if (!avatarFile)
    throw new ApiError(500, "File not Uploaded. Please try again!!");

  const oldAvatarId = req.user?.avatar.public_id;

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: { url: avatarFile.url, public_id: avatarFile.public_id },
      },
    },
    {
      new: true,
    }
  );

  await cachedHMapService.set(userKey, "avatar", {
    url: avatarFile.url,
    public_id: avatarFile.public_id,
  });

  if (oldAvatarId) await destroyOnCloudinary(oldAvatarId);

  return res
    .status(201)
    .json(new ApiResponse(200, {}, "Avatar Changed Successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImage = req.file?.path;

  if (!coverImage) throw new ApiError(401, "Cover Image is Missing");

  const coverFile = await uploadOnCloudindary(coverImage);

  if (!coverFile)
    throw new ApiError(500, "File not Uploaded. Please try again!!");

  const oldcoverImageId = req.user?.coverImage.public_id;

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: { url: coverFile.url, public_id: coverFile.public_id },
      },
    },
    {
      new: true,
    }
  );

  const userKey = `user:${req.user._id}`;

  await cachedHMapService.set(userKey, "coverImage", {
    url: coverFile.url,
    public_id: coverFile.public_id,
  });

  if (oldcoverImageId) await destroyOnCloudinary(oldcoverImageId);

  return res
    .status(201)
    .json(new ApiResponse(200, {}, "Cover Image Changed Successfully"));
});

const removeAvatar = asyncHandler(async (req, res) => {
  if (!req.user?.avatar?.public_id) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "No Avatar to remove"));
  }

  await destroyOnCloudinary(req.user?.avatar.public_id);

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: { url: "", public_id: "" },
      },
    },
    {
      new: true,
    }
  );

  const userKey = `user:${req.user._id}`;

  await cachedHMapService.set(userKey, "avatar", {
    url: "",
    public_id: "",
  });

  return res
    .status(201)
    .json(new ApiResponse(200, {}, "Avatar removed Successfully"));
});

const removeCoverImage = asyncHandler(async (req, res) => {
  if (!req.user?.coverImage?.public_id) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "No Cover Image to remove"));
  }

  await destroyOnCloudinary(req.user?.coverImage.public_id);

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: { url: "", public_id: "" },
      },
    },
    {
      new: true,
    }
  );

  const userKey = `user:${req.user._id}`;

  await cachedHMapService.set(userKey, "coverImage", {
    url: "",
    public_id: "",
  });

  return res
    .status(201)
    .json(new ApiResponse(200, {}, "Cover Image removed Successfully"));
});

//Subscription Dependency
const getChannelProfileDetails = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) throw new ApiError(200, "Username missing");

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subcriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subcriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribers: {
          $size: "$subscribers",
        },
        subscribedTo: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        biography: 1,
        subscribers: 1,
        subscribedTo: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel) throw new ApiError(404, "User not Found");

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User Data Fetched Successfully"));
});

const getChannelProfileDetailsById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) throw new ApiError(200, "User ID missing");

  const channel = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "subcriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subcriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribers: {
          $size: "$subscribers",
        },
        subscribedTo: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        biography: 1,
        subscribers: 1,
        subscribedTo: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel) throw new ApiError(404, "User not Found");

  // await cachedStringService.set(cachedKey, channel[0]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Data Fetched By ID Successfully")
    );
});

const addToWatchHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $addToSet: { watchHistory: videoId },
    },
    { new: true }
  );
  if (!user) throw new ApiError(404, "User Not Found");

  const userKey = `user:${req.user._id}`;

  const history = await cachedHMapService.get(userKey, "watchHistory");

  history.push(videoId);

  await cachedHMapService.set(userKey, "watchHistory", history);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Added to Watch History Successfully"));
});

//Videos Dependency
const watchHistory = asyncHandler(async (req, res) => {
  const userKey = `user:${req.user._id}`;

  const history = await cachedHMapService.get(userKey, "watchHistory");

  let user = null;

  if (!history || history.length === 0) {
    user = await User.findById(req?.user._id).select("watchHistory");
  }

  const VideoIds = history && history.length > 0 ? history : user.watchHistory;

  // const response = await axios.post(
  //   `${process.env.BASE_URL}/bulk`,
  //   { videoIds: history && history.length > 0 ? history : user.watchHistory },
  //   {
  //     headers: {
  //       Authorization: req.user.authorization,
  //     },
  //   }
  // );
  // if (!response) throw new ApiError(404, "Response Not Found");

  // return res
  //   .status(200)
  //   .json(new ApiResponse(200, response.data.data, "Watch history fetched"));

  video_protoclient.getBulkVideosList(
    { VideoIds: VideoIds },
    (error, response) => {
      if (error) throw new ApiError(404, error.message);
      return res
        .status(200)
        .json(new ApiResponse(200, response.videos, "Watch history fetched"));
    }
  );
});

const getBulkUsers = asyncHandler(async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || userIds.length === 0)
    throw new ApiError(400, "User Ids are missing");

  const keys = userIds.map((id) => `user:${id}`);

  const pipeline = client.pipeline();
  keys.forEach((key) => {
    pipeline.hgetall(key);
  });

  const results = await pipeline.exec();
  const cachedUsers = results.map(([err, val]) => (val ? val : null));

  const existingUsers = [];
  const missingUserIds = [];

  cachedUsers.forEach((userData, index) => {
    if (userData && Object.keys(userData).length > 0) {
      existingUsers.push(userData);
    } else {
      missingUserIds.push(userIds[index]);
    }
  });

  if (missingUserIds.length > 0) {
    const users = await User.find({ _id: { $in: missingUserIds } }).select(
      "-password -refreshToken -createdAt -updatedAt -__v"
    );

    if (!users || users.length === 0) throw new ApiError(404, "No Users Found");

    const pipelineSet = client.pipeline();

    users.forEach((user) => {
      pipelineSet.hmset(`user:${user._id}`, {
        _id: user._id,
        username: user.username.toLowerCase(),
        fullName: user.fullName,
        email: user.email,
        biography: user.biography,
        avatar: user.avatar ? user.avatar : "",
        coverImage: user.coverImage ? user.coverImage : "",
        watchHistory: user.watchHistory ? user.watchHistory : [],
      });
    });

    await pipelineSet.exec();

    existingUsers.push(...users);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, existingUsers, "Users Fetched Successfully"));
});

const server = new grpc.Server();
server.addService(userPackage.UserService.service, {
  getBulkUsersList: async (call, callback) => {
    try {
      const { UserIds } = call.request;
      const users = await User.find({ _id: { $in: UserIds } });
      console.log("Users", users);

      callback(null, { users });
    } catch (error) {
      callback(error, null);
    }
  },
});
server.bindAsync(
  "0.0.0.0:50052",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log("gRPC Video Service running on port 50052");
  }
);

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAcessToken,
  changeUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  removeAvatar,
  updateUserCoverImage,
  removeCoverImage,
  getChannelProfileDetails,
  watchHistory,
  getChannelProfileDetailsById,
  addToWatchHistory,
  getBulkUsers,
};
