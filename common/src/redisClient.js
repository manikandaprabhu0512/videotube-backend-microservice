import Redis from "ioredis";

const client = new Redis({
  host: "localhost",
  port: 6379,
});

client.on("connect", () => console.log("✅ Connected to Redis successfully"));
client.on("error", (err) => console.error("❌ Redis Error:", err));

export default client;
