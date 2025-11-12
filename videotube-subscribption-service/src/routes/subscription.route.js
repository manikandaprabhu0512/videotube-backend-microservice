import { Router } from "express";
import {
  channelSubscribed,
  channelSubscribers,
  subscribeChannel,
  unsubcribeChannel,
} from "../controller/subscription.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/c/:channelId").post(subscribeChannel);

router.route("/c/:channelId").delete(unsubcribeChannel);

router.route("/c/subscribers/:channelId").get(channelSubscribers);

router.route("/c/subscribed/:channelId").get(channelSubscribed);

export default router;
