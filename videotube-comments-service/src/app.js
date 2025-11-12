import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
// import client from "./services/redisClient.js";

const app = express();

// client.on("ready", () => {
//   console.log("✅ Redis is ready");
// });

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

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

app.use(cookieParser());

// Routing
import commentsRouter from "./routes/comments.route.js";

// Router Declartion
app.use("/", commentsRouter);

export { app };
