import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  addComment,
  deleteAComment,
  getAComment,
  getVideoComments,
  updateAComment,
} from "../controller/comments.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/add-comments/c/:videoId").post(addComment);

router.route("/update-comments/c/:commentId").patch(updateAComment);

router.route("/delete-comments/c/:commentId").delete(deleteAComment);

router.route("/c/:commentId").get(getAComment);

router.route("/video/c/:videoId").get(getVideoComments);

export default router;
