import { ApiError } from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  destroyOnCloudinary,
  uploadOnCloudindary,
} from "../utils/cloudinary.js";
import prisma from "../db/index.js";

const createAPlayList = asyncHandler(async (req, res, next) => {
  const { playListName, description } = req.body;

  if (!(playListName || description))
    throw new ApiError(400, "Requires Details");

  const thumbnailPath = req.file?.path;

  if (!thumbnailPath) throw new ApiError(400, "Thumbnail Missing");

  const thumbnail = await uploadOnCloudindary(thumbnailPath);

  if (!thumbnail) throw new ApiError(500, "Upload Failed on Cloudinary");

  const playList = await prisma.videoTubePlaylist.create({
    data: {
      name: playListName,
      description: description,
      thumbnail: [thumbnail?.url, thumbnail?.public_id],
      userId: req.user?._id,
    },
  });

  if (!playList) throw new ApiError(400, "Error Creating PlayList");

  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Playlist Created Successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) throw new ApiError("UserId is missing");

  const playListData = await prisma.videoTubePlaylist.findMany({
    where: { userId },
  });

  if (!playListData) throw new ApiError(404, "User Doesnot Exists");

  return res
    .status(200)
    .json(new ApiResponse(200, playListData, "PlayList Fetched Successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res, next) => {
  const { playListId, videoId } = req.params;

  if (!videoId) throw new ApiError(400, "VideoId is Missing");
  if (!playListId) throw new ApiError(400, "PlayListId is Missing");

  const addedVideo = await prisma.videoTubePlaylist.update({
    where: { id: playListId },
    data: {
      videos: { push: videoId },
    },
  });

  if (!addedVideo) throw new ApiError(404, "PlayList Not Found");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        addedVideo.videos,
        "Video Added To Playlist Successfully"
      )
    );
});

const getPlayListById = asyncHandler(async (req, res, next) => {
  const { playListId } = req.params;

  if (!playListId) throw new ApiError(400, "PlayListID is missing");

  const playListVideo = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playListId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $project: {
              videoFile: 1,
              thumbnail: 1,
              title: 1,
              description: 1,
              duration: 1,
              views: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, playListVideo[0], "Playlist Fetched Successfully")
    );
});

const removeVideoFromPlayList = asyncHandler(async (req, res, next) => {
  const { playListId, videoId } = req.params;

  if (!videoId) throw new ApiError(400, "VideoID is missing");

  const playList = await prisma.videoTubePlaylist.findUnique({
    where: { id: playListId },
  });

  if (!playList.videos.includes(videoId))
    throw new ApiError(404, "Video Not Found in Playlist");

  const updatedVideos = playList.videos.filter((id) => id !== videoId);

  const removeddetails = await prisma.videoTubePlaylist.update({
    where: { id: playListId },
    data: {
      videos: { set: updatedVideos },
    },
  });

  if (!removeddetails) throw new ApiError(404, "PlayList Not Found");

  return res
    .status(200)
    .json(
      new ApiResponse(200, removeddetails.videos, "Video Removed Successfully")
    );
});

const deleteAPlayListById = asyncHandler(async (req, res, next) => {
  const { playListId } = req.params;

  if (!playListId) throw new ApiError(400, "PlayListid is missing");

  const deletedPlayList = await prisma.videoTubePlaylist.delete({
    where: { id: playListId },
  });

  if (!deletedPlayList) throw new ApiError(404, "PlayList not found");

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedPlayList, "PlayList Deleted Successfully")
    );
});

const updateAPlayList = asyncHandler(async (req, res, next) => {
  const { playListId } = req.params;
  const { name, description } = req.body;

  if (!playListId) throw new ApiError(400, "Playlist id is missing");

  if (!(name || description)) throw new ApiError(400, "Required Credential");

  const duplicateTitle = await prisma.videoTubePlaylist.findUnique({
    where: { name: name },
  });

  if (duplicateTitle) throw new ApiError(400, "PlayList Name must be unique");

  const playList = await prisma.videoTubePlaylist.update({
    where: { id: playListId },
    data: {
      name,
      description,
    },
  });

  if (!playList) throw new ApiError(404, "PlayList not found");

  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Updated successfully"));
});

const updateThumbnail = asyncHandler(async (req, res, next) => {
  const { playListId } = req.params;

  const ThumbnailPath = req.file?.path;

  if (!ThumbnailPath) throw new ApiError(404, "Thumbnail is Missing");

  const Thumbnail = await uploadOnCloudindary(ThumbnailPath);

  if (!Thumbnail) throw new ApiError(400, "Upload failed");

  const oldPlayListId = await prisma.videoTubePlaylist.findUnique({
    where: { id: playListId },
  });

  const newPlayList = await prisma.videoTubePlaylist.update({
    where: { id: playListId },
    data: {
      thumbnail: { set: [Thumbnail?.url, Thumbnail?.public_id] },
    },
  });

  if (!newPlayList) throw new ApiError(404, "PlayList Not Found");

  await destroyOnCloudinary(oldPlayListId.thumbnail[1]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newPlayList.thumbnail,
        "Thumbnail Updated Successfully"
      )
    );
});

export {
  createAPlayList,
  getUserPlaylists,
  addVideoToPlaylist,
  getPlayListById,
  removeVideoFromPlayList,
  deleteAPlayListById,
  updateAPlayList,
  updateThumbnail,
};
