import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
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
} from "../controller/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refreshToken").post(refreshAcessToken);

router.route("/changePassword").post(verifyJWT, changeUserPassword);

router.route("/getCurrentUser").get(verifyJWT, getCurrentUser);

router.route("/updateAccountDetails").patch(verifyJWT, updateAccountDetails);

router
  .route("/updateUserAvatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router
  .route("/updateUserCoverImage")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/removeavatar").post(verifyJWT, removeAvatar);

router.route("/removecoverimage").post(verifyJWT, removeCoverImage);

// Params Data
router.route("/c/:username").get(verifyJWT, getChannelProfileDetails);

router.route("/c/id/:userId").get(verifyJWT, getChannelProfileDetailsById);

router.route("/watchHistory").get(verifyJWT, watchHistory);

router.route("/history").patch(verifyJWT, addToWatchHistory);

router.route("/bulk").post(getBulkUsers);

export default router;
