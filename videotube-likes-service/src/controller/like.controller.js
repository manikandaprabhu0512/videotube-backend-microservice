import { ApiError } from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import axios from "axios";

const toggleVideoLike = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;

  if (!videoId) throw new ApiError(400, "Video Id is not found");

  const findVideo = await axios.get(
    `${process.env.BASE_VIDEO_URL}/c/${videoId}`,
    {
      headers: {
        Authorization: req.user.authorization,
      },
    }
  );

  if (!findVideo) throw new ApiError(404, "Video Not Found");

  const userId = req.user?._id;

  const exisiting = await prisma.like.findFirst({
    where: {
      likedVideo: videoId,
      userId,
    },
  });

  if (exisiting) {
    await prisma.like.delete({
      where: {
        id: exisiting.id,
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unliked Successfully"));
  }

  const likeAVideo = await prisma.like.create({
    data: {
      likedVideo: videoId,
      userId,
    },
  });

  if (!likeAVideo) throw new ApiError(400, "Something went wrong!!");

  return res
    .status(200)
    .json(new ApiResponse(200, likeAVideo, "Liked Video Successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res, next) => {
  const { commentId } = req.params;

  if (!commentId) throw new ApiError(400, "Comment Id is not found");

  const findComment = await axios.get(
    `${process.env.BASE_COMMENT_URL}/c/${commentId}`,
    {
      headers: {
        Authorization: req.user.authorization,
      },
    }
  );

  if (!findComment) throw new ApiError(404, "Comment Not Found");

  const userId = req.user?._id;

  const exisiting = await prisma.like.findFirst({
    where: {
      likedComment: commentId,
      userId,
    },
  });

  if (exisiting) {
    await prisma.like.delete({
      where: {
        id: exisiting.id,
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unliked Successfully"));
  }

  const likeAComment = await prisma.like.create({
    data: {
      likedComment: commentId,
      userId,
    },
  });

  if (!likeAComment) throw new ApiError(400, "Something went wrong!!");

  return res
    .status(200)
    .json(new ApiResponse(200, likeAComment, "Liked Video Successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res, next) => {
  const { tweetId } = req.params;

  if (!tweetId) throw new ApiError(400, "Video Id is not found");

  const userId = req.user?._id;

  const exisiting = await prisma.like.findFirst({
    where: {
      likedTweet: tweetId,
      userId: userId,
    },
  });

  if (exisiting) {
    await prisma.like.delete({
      where: {
        id: exisiting.id,
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unliked Successfully"));
  }

  const likeATweet = await prisma.like.create({
    data: {
      likedTweet: tweetId,
      userId: userId,
    },
  });

  if (!likeATweet) throw new ApiError(400, "Something went wrong!!");

  return res
    .status(200)
    .json(new ApiResponse(200, likeATweet, "Liked Video Successfully"));
});

const getAllVideoLikes = asyncHandler(async (req, res, next) => {
  const { cursor, limit = 10, sortBy = "createdAt", sortType } = req.query;
  const { videoId } = req.params;

  if (!videoId) throw new ApiError(400, "VideoId is missing");

  const likedVideo = await prisma.like.findMany({
    where: {
      likedVideo: videoId,
    },
    orderBy: {
      [sortBy]: sortType === "asc" ? "asc" : "desc",
    },
    take: parseInt(limit, 10),
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    select: {
      userId: true,
    },
  });

  if (!likedVideo) throw new ApiError(404, "No Likes Found");

  const response = await axios.post(
    `${process.env.BASE_URL}/bulk`,
    { userIds: likedVideo.map((likes) => likes.userId) },
    {
      headers: {
        Authorization: req.user.authorization,
      },
    }
  );

  const userData = response.data.data;

  const detailedLikes = likedVideo.map((like) => {
    const user = userData.find((user) => user._id === like.userId);
    return {
      ...like,
      ...(user
        ? {
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar,
          }
        : null),
    };
  });

  const hasNextPage = detailedLikes.length === parseInt(limit, 10);
  const nextCursor = hasNextPage
    ? detailedLikes[detailedLikes.length - 1].id
    : null;

  const result = {
    likes: detailedLikes,
    nextCursor,
    hasNextPage,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Liked Videos List"));
});

const getAllCommetLikes = asyncHandler(async (req, res, next) => {
  const { cursor, limit = 10, sortBy = "createdAt", sortType } = req.query;
  const { commentId } = req.params;

  if (!commentId) throw new ApiError(400, "CommentId is missing");

  const likedComments = await prisma.like.findMany({
    where: {
      likedComment: commentId,
    },
    orderBy: {
      [sortBy]: sortType === "asc" ? "asc" : "desc",
    },
    take: parseInt(limit, 10),
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    select: {
      userId: true,
    },
  });

  if (!likedComments) throw new ApiError(404, "No Likes Found");

  const response = await axios.post(
    `${process.env.BASE_URL}/bulk`,
    { userIds: likedComments.map((likes) => likes.userId) },
    {
      headers: {
        Authorization: req.user.authorization,
      },
    }
  );

  const userData = response.data.data;

  const detailedLikes = likedComments.map((like) => {
    const user = userData.find((user) => user._id === like.userId);
    return {
      ...like,
      ...(user
        ? {
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar,
          }
        : null),
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, detailedLikes, "Liked Comments List"));
});

const getAllTweetLikes = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const { tweetId } = req.params;

  if (!tweetId) throw new ApiError(400, "VideoId is missing");

  const likedTweetsAggregate = Like.aggregate([
    {
      $match: {
        likedVideo: new mongoose.Types.ObjectId(tweetId),
      },
    },
    {
      $sort: {
        createdBy: -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 1),
    limit: parseInt(limit, 10),
  };

  const likedTweetsAggregatePaginate = await Like.aggregatePaginate(
    likedTweetsAggregate,
    options
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedTweetsAggregatePaginate, "Liked Videos List")
    );
});

const getVideosLikes = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) throw new ApiError(400, "Video Id is missing");

  const videoLikes = await Like.find({
    likedVideo: new mongoose.Types.ObjectId(videoId),
  });

  if (!videoLikes) throw new ApiError(404, "Video Not Found");

  return res
    .status(200)
    .json(new ApiResponse(200, videoLikes, "Video Likes Fetched Successfully"));
});

export {
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
  getAllVideoLikes,
  getAllCommetLikes,
  getAllTweetLikes,
  getVideosLikes,
};
