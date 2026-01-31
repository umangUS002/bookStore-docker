import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("ready", () => {
  console.log("✅ Redis connected & ready");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis error", err);
});

(async () => {
  await redisClient.connect();
})();

export default redisClient;
