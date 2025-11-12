import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
  deleteAVideo,
  getAllVideo,
  getAVideo,
  getVideosByUsername,
  pulishAVideo,
  togglePublishVideo,
  addVideoToWatchHistory,
  updateThumbnail,
  updateVideoDetails,
} from "../controllers/video.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/publishVideo").post(
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  pulishAVideo
);

router.route("/c/:videoId").get(getAVideo);

router.route("/c/:videoId").patch(updateVideoDetails);

router
  .route("/c/thumbnail/:videoId")
  .patch(upload.single("thumbnail"), updateThumbnail);

router.route("/c/:videoId").delete(deleteAVideo);

router.route("/c/toggle/:videoId").patch(togglePublishVideo);

router.route("/").get(getAllVideo);

router.route("/c/user/:username").get(getVideosByUsername);

router.route("/c/watchHistory/:videoId").patch(addVideoToWatchHistory);

// router.route("/bulk").post(getbulkVideos);

export default router;
