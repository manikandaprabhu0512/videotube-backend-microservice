import { ApiError } from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import axios from "axios";

const addComment = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;

  const { content } = req.body;

  if (!videoId) throw new ApiError(400, "VideoId is missing");

  if (!content) throw new ApiError(400, "Comment is missing");

  const newComment = await prisma.comment.create({
    data: {
      content: content,
      videoId: videoId,
      owner: req.user?._id,
    },
  });

  if (!newComment) throw new ApiError(400, "Error adding comment");

  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "Added Comment Successfully"));
});

const updateAComment = asyncHandler(async (req, res, next) => {
  const { commentId } = req.params;

  const { content } = req.body;

  if (!commentId) throw new ApiError(200, "Comment Id is Missing");

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
  });

  if (!updatedComment) throw new ApiError(400, "Comment not Found");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Added Comment Successfully"));
});

const deleteAComment = asyncHandler(async (req, res, next) => {
  const { commentId } = req.params;

  if (!commentId) throw new ApiError(200, "Comment Id is Missing");

  const deletedComment = await prisma.comment.delete({
    where: { id: commentId },
  });

  if (!deletedComment) throw new ApiError(400, "Comment not Found");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Deleted Comment Successfully"));
});

const getAComment = asyncHandler(async (req, res, next) => {
  const { commentId } = req.params;
  if (!commentId) throw new ApiError(400, "Comment Id is missing");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) throw new ApiError(404, "Comment Not Found");

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment Fetched Successfully"));
});

const getVideoComments = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;

  const { cursor, limit = 10, sortBy = "createdAt", sortType } = req.query;

  const commentList = await prisma.comment.findMany({
    where: { videoId: videoId },
    orderBy: {
      [sortBy]: sortType === "asc" ? "asc" : "desc",
    },
    take: parseInt(limit, 10),
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  if (!commentList) throw new ApiError(400, "Error fetching comments");

  const response = await axios.post(
    `${process.env.BASE_URL}/bulk`,
    { userIds: commentList.map((comment) => comment.owner) },
    {
      headers: {
        Authorization: req.user.authorization,
      },
    }
  );

  const userData = response.data.data;
  const detailedComments = commentList.map((comment) => {
    const matchedUser = userData.find(
      (user) => user._id.toString() === comment.owner.toString()
    );

    return {
      ...comment,
      owner: matchedUser
        ? {
            username: matchedUser.username,
            fullName: matchedUser.fullName,
            avatar: matchedUser.avatar,
          }
        : null,
    };
  });

  const hasNextPage = detailedComments.length === parseInt(limit, 10);
  const nextCursor = hasNextPage
    ? detailedComments[detailedComments.length - 1].id
    : null;

  const result = {
    comments: detailedComments,
    nextCursor,
    hasNextPage,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Comments Fetched Successfully"));
});

export {
  addComment,
  updateAComment,
  deleteAComment,
  getVideoComments,
  getAComment,
};
