import { Router } from "express";
import {
  getAllCommetLikes,
  getAllTweetLikes,
  getAllVideoLikes,
  getVideosLikes,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from "../controller/like.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/video/c/:videoId").post(toggleVideoLike);

router.route("/comment/c/:commentId").post(toggleCommentLike);

router.route("/tweet/c/:tweetId").post(toggleTweetLike);

router.route("/videos/c/:videoId").get(getAllVideoLikes);

router.route("/comment/c/:commentId").get(getAllCommetLikes);

router.route("/videos/likes/c/:videoId").get(getVideosLikes);

router.route("/comments/c/:tweetId").get(getAllTweetLikes);

export default router;
