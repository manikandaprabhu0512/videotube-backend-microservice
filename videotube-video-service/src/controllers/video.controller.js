import mongoose from "mongoose";
import { Video } from "../model/video.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  destroyOnCloudinary,
  destroyVideoOnCloudinary,
  uploadOnCloudindary,
} from "../utils/cloudinary.js";
import axios from "axios";
import { cachedHMapService } from "../../../gateway/services/cacheService.js";
import client from "../../../gateway/services/redisClient.js";
import grpc from "@grpc/grpc-js";
import { videoPackage } from "../../../proto/proto_controllers/video.proto.js";
import { user_protoclient } from "../../../proto/proto_controllers/user.proto.js";

const pulishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!(title || description))
    throw new ApiError(400, "Requires All Credentials");

  const videoLocalPath = req.files?.videoFile[0]?.path;

  if (!videoLocalPath) throw new ApiError(400, "Video Required");

  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!thumbnailLocalPath) throw new ApiError(400, "Thumbnail Required");

  const videoFile = await uploadOnCloudindary(videoLocalPath);

  const thumbnail = await uploadOnCloudindary(thumbnailLocalPath);

  const videoDetails = await Video.create({
    videoFile: { url: videoFile.url, public_id: videoFile.public_id },
    thumbnail: { url: thumbnail.url, public_id: thumbnail.public_id },
    title,
    description,
    duration: videoFile.duration.toFixed(2),
    owner: req.user?._id,
  });

  if (!videoDetails) throw new ApiError(400, "Video Upload Failed");

  return res
    .status(201)
    .json(new ApiResponse(200, videoDetails, "Video Uploaded Sucessfully"));
});

const getAVideo = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  const videoKey = `video:${video._id}`;

  const videocached = await cachedHMapService.getAll(videoKey);

  const userCached = await cachedHMapService.getAll(
    `user:${videocached.owner.toString()}`
  );

  if (userCached) {
    const cached = {
      ...videocached,
      owner: {
        username: userCached.username,
        fullName: userCached.fullName,
        avatar: userCached.avatar,
      },
    };

    if (cached) {
      return res
        .status(200)
        .json(new ApiResponse(200, cached, "Video Fetched Successfully"));
    }
  }

  const user = await axios.get(
    `${process.env.BASE_URL}/c/id/${video.owner.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${req.user.authorization}`,
      },
    }
  );
  const videoDetails = {
    ...video._doc,
    owner: {
      username: user.data.data.username,
      fullName: user.data.data.fullName,
      avatar: user.data.data.avatar,
    },
  };

  const hashData = {
    _id: videoDetails._id,
    videoFile: videoDetails.videoFile,
    title: videoDetails.title,
    description: videoDetails.description,
    duration: videoDetails.duration,
    views: videoDetails.views,
    isPublished: videoDetails.isPublished,
    owner: user.data.data._id,
    createdAt: videoDetails.createdAt,
    updatedAt: videoDetails.updatedAt,
  };

  for (const [field, value] of Object.entries(hashData)) {
    await cachedHMapService.set(videoKey, field, value);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videoDetails, "Video Fetched Successfully"));
});

const getVideosByUsername = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  if (!username) throw new ApiError(400, "Username Id is missing");

  const user = await axios.get(`${process.env.BASE_URL}/c/${username}`, {
    headers: {
      Authorization: `Bearer ${req.user.authorization}`,
    },
  });

  const userData = user.data?.data || user.data;

  if (!userData) throw new ApiError(404, "User not found");

  const videos = await Video.find({ owner: userData._id }).sort({
    createdAt: -1,
  });

  const pipeline = client.pipeline();

  const videoKeys = videos.map((video) => video._id);

  videoKeys.forEach((key) => {
    pipeline.hgetall(key);
  });

  const results = await pipeline.exec();

  const videoDetailss = results.map(([err, data]) => {
    if (err) return null;
    return data && Object.keys(data).length > 0 ? data : null;
  });

  const videoDetails = videos.map((video) => ({
    ...video._doc,
    owner: {
      username: userData.username,
      fullName: userData.fullName,
      avatar: userData.avatar,
    },
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, videoDetails, "Videos Fetched Successfully"));
});

const updateVideoDetails = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;

  const videoKey = `video:${videoId}`;

  const { title, description } = req.body;

  if (!(title || description))
    throw new ApiError(400, "Requires Fields to Update");

  const video = await Video.findById(videoId);

  if (video.owner.toString() !== req?.user._id.toString())
    throw new ApiError(403, "Unauthorized Request");

  const videoDetails = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
      },
    },
    { new: true }
  );

  if (title) {
    await cachedHMapService.set(videoKey, "title", title);
  }

  if (description) {
    await cachedHMapService.set(videoKey, "description", description);
  }

  if (!videoDetails) throw new ApiError(404, "Video Not Found");

  return res
    .status(200)
    .json(
      new ApiResponse(200, videoDetails, "Video Details Updated Successfully")
    );
});

const updateThumbnail = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;

  const newThumnailPath = req.file?.path;

  if (!newThumnailPath) throw new ApiError(400, "Thumbnail is missing");

  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "Video Not Found");

  if (video.owner.toString() !== req?.user._id.toString())
    throw new ApiError(401, "Unauthorized Request");

  const newThumbnail = await uploadOnCloudindary(newThumnailPath);

  const oldThumbnailId = video.thumbnail.public_id;

  video.thumbnail.url = newThumbnail.url;
  video.thumbnail.public_id = newThumbnail.public_id;
  await video.save({ validateBeforeSave: false });

  const videoKey = `video:${videoId}`;

  await cachedHMapService.set(videoKey, "thumbnail", {
    url: newThumbnail.url,
    public_id: newThumbnail.public_id,
  });

  if (oldThumbnailId) await destroyOnCloudinary(oldThumbnailId);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Thumbnail Changed Successfully"));
});

const deleteAVideo = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;

  const response = await Video.findByIdAndDelete(videoId);

  if (!response) throw new ApiError(404, "Video Not Found");

  if (response.videoFile.public_id) {
    await destroyVideoOnCloudinary(response.videoFile.public_id);
  }
  if (response.thumbnail.public_id) {
    await destroyOnCloudinary(response.thumbnail.public_id);
  }

  const videoKey = `video:${videoId}`;

  await cachedHMapService.delAll(videoKey);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video Deleted Successfully"));
});

const togglePublishVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) throw new ApiError(400, "Video is Missing");

  const videoDetails = await Video.findById(videoId);

  if (!videoDetails) throw new ApiError(404, "Video Not Found");

  videoDetails.isPublished = !videoDetails.isPublished;
  const value = videoDetails.isPublished;
  videoDetails.save({ validateBeforeSave: false });

  const videoKey = `video:${videoId}`;

  await cachedHMapService.set(videoKey, "isPublished", value);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoDetails.isPublished,
        "Videoe Archived Successfully"
      )
    );
});

const getAllVideo = asyncHandler(async (req, res) => {
  const {
    limit = 10,
    cursor,
    query,
    sortBy = "createdAt",
    sortType,
  } = req.query;

  const filter = {};

  if (query) {
    filter.title = { $regex: query, $options: "i" };
  }

  if (cursor) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const videos = await Video.find(filter)
    .sort({
      [sortBy]: sortType === "asc" ? 1 : -1,
    })
    .limit(parseInt(limit, 10) + 1);

  if (!videos) throw new ApiError(404, "No Videos Found");

  // const response = await axios.post(
  //   `${process.env.BASE_URL}/bulk`,
  //   { userIds: videos.map((video) => video.owner) },
  //   {
  //     headers: {
  //       Authorization: req.user.authorization,
  //     },
  //   }
  // );
  user_protoclient.getBulkUsersList(
    { UserIds: videos.map((video) => video.owner) },
    (error, response) => {
      if (error) throw new ApiError(404, error.message);
      console.log("Response: ", response.users);

      const videoDetails = videos.map((video) => {
        const matchedUser = response.users.find(
          (user) => user._id.toString() === video.owner.toString()
        );

        return {
          ...video._doc,
          owner: matchedUser
            ? {
                username: matchedUser.username,
                fullName: matchedUser.fullName,
                avatar: matchedUser.avatar,
              }
            : null,
        };
      });

      const hasNextPage = videos.length > parseInt(limit, 10);
      if (hasNextPage) videos.pop();

      const nextCursor = hasNextPage ? videos[videos.length - 1]._id : null;

      const videosList = {
        videoDetails,
        nextCursor,
        hasNextPage,
      };

      return res
        .status(200)
        .json(new ApiResponse(200, videosList, "Videos Fetched Successfully"));
    }
  );
});

const addVideoToWatchHistory = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;

  if (!videoId) throw new ApiError(400, "Video is Missing");

  const response = await axios.patch(
    `${process.env.BASE_URL}/history`,
    { videoId },
    {
      headers: { Authorization: req.user.authorization },
    }
  );

  if (!response.data) throw new ApiError(404, "User Not Found");

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Video Added to Watch History Successfully")
    );
});

const server = new grpc.Server();

server.addService(videoPackage.VideoService.service, {
  getBulkVideosList: async (call, callback) => {
    try {
      const { VideoIds } = call.request;
      const videos = await Video.find({ _id: { $in: VideoIds } });
      callback(null, { videos });
    } catch (error) {
      callback(error, null);
    }
  },
});
server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log("gRPC Video Service running on port 50051");
  }
);

// const getbulkVideos = asyncHandler(async (req, res) => {
//   const { videoIds } = req.body;

//   if (!videoIds || videoIds.length === 0)
//     throw new ApiError(400, "Video Ids are missing");

//   const videos = await Video.find({ _id: { $in: videoIds } }).select(
//     "title thumbnail duration videoFile description views owner createdAt"
//   );

//   const videos = [];

//   if (!videos || videos.length === 0)
//     throw new ApiError(404, "No Videos Found");

//   return res
//     .status(200)
//     .json(new ApiResponse(200, videos, "Bulk videos fetched successfully"));
// });

export {
  pulishAVideo,
  getAVideo,
  updateVideoDetails,
  updateThumbnail,
  deleteAVideo,
  togglePublishVideo,
  getAllVideo,
  getVideosByUsername,
  addVideoToWatchHistory,
};
