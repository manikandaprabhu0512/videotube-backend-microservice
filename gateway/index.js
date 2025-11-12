import express from "express";
import expressProxy from "express-http-proxy";
import cors from "cors";
import client from "./services/redisClient.js";

const app = express();

client.on("ready", () => {
  console.log("✅ Redis is ready");
});

const allowedOrigins = [
  "http://localhost:5173", // dev
  "https://video-tube-frontend-gamma.vercel.app", // production frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("Welcome to Gateway");
});

app.use("/api/v1/users", expressProxy("http://host.docker.internal:8001"));
app.use(
  "/api/v1/videos",
  expressProxy("http://localhost:8002", {
    limit: "50mb",
    proxyReqBodyDecorator: (bodyContent, srcReq) => bodyContent,
  })
);
app.use("/api/v1/subscriptions", expressProxy("http://localhost:8003"));
app.use("/api/v1/comments", expressProxy("http://localhost:8004"));
app.use("/api/v1/likes", expressProxy("http://localhost:8005"));
app.use("/api/v1/playlist", expressProxy("http://localhost:8006"));

app.listen(8000, () => {
  console.log("API Gateway is running on port 8000");
});
