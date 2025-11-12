import { ApiError } from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import axios from "axios";
// import { cachedHMapService } from "../services/cacheService.js";

const subscribeChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const userId = req.user?._id;
  // const key = `subscribers:${channelId}`;

  if (userId == channelId)
    throw new ApiError(400, "Cannot Subscribe to yourself");

  const existingUser = await prisma.subscription.findUnique({
    where: {
      subscriber_channel: {
        subscriber: userId,
        channel: channelId,
      },
    },
  });

  if (existingUser) throw new ApiError(400, "Already Subscribed");

  const subscribedUser = await prisma.subscription.create({
    data: {
      subscriber: userId,
      channel: channelId,
    },
  });

  // const fieldKey = subscribedUser._id.toString();

  // const data = {
  //   _id: subscribedUser._id.toString(),
  //   username: req?.user.username,
  //   fullName: req.user?.fullName,
  //   avatar: req?.user.avatar,
  // };

  // await cachedHMapService.set(key, fieldKey, data);

  return res
    .status(200)
    .json(new ApiResponse(200, subscribedUser, "User Subscribed Successfully"));
});

const unsubcribeChannel = asyncHandler(async (req, res, next) => {
  const { channelId } = req.params;

  const userId = req.user?._id;

  // const key = `subscribers:${channelId}`;

  if (channelId === userId) throw new ApiError(401, "Invalid Action");

  const unsubcribe = await prisma.subscription.delete({
    where: {
      subscriber_channel: {
        subscriber: userId,
        channel: channelId,
      },
    },
  });

  if (!unsubcribe) throw new ApiError(400, "Channel Doesn't Exists");

  // const fieldKey = unsubcribe._id.toString();
  // await cachedHMapService.del(key, fieldKey);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Unsubscribed Successfully"));
});

const channelSubscribers = asyncHandler(async (req, res, next) => {
  const { channelId } = req.params;

  const isChannelId = await prisma.subscription.findMany({
    where: {
      channel: channelId,
    },
  });

  if (!isChannelId) throw new ApiError(404, "Channel Not Found");

  const subscribers = await axios.post(
    `${process.env.BASE_URL}/bulk`,
    { userIds: isChannelId.map((sub) => sub.subscriber) },
    {
      headers: {
        Authorization: req.user.authorization,
      },
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers.data.data,
        "Subscribers Fetched Successfully"
      )
    );
});

const channelSubscribed = asyncHandler(async (req, res, next) => {
  const { channelId } = req.params;

  const isChannelId = await prisma.subscription.findMany({
    where: {
      subscriber: channelId,
    },
  });

  if (!isChannelId) throw new ApiError(404, "Channel Not Found");

  const subscribed = await axios.post(
    `${process.env.BASE_URL}/bulk`,
    { userIds: isChannelId.map((sub) => sub.channel) },
    {
      headers: {
        Authorization: req.user.authorization,
      },
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribed.data.data,
        "Channel Subscriber Fetched Successfully"
      )
    );
});

export {
  subscribeChannel,
  unsubcribeChannel,
  channelSubscribers,
  channelSubscribed,
};
