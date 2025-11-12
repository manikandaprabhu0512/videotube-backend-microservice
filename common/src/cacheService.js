import client from "./redisClient.js";

export const cachedStringService = {
  async get(key) {
    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    await client.set(key, JSON.stringify(value));
    await client.expire(key, ttl);
  },

  async del(key) {
    await client.del(key);
  },
};

export const cachedHMapService = {
  async get(key, field) {
    try {
      const data = await client.hget(key, field);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  },

  async mget(key, fields) {
    try {
      const data = await client.hmget(key, fields);
      return data.map((item) => (item ? JSON.parse(item) : null));
    } catch (error) {
      return null;
    }
  },

  async set(key, field, value) {
    try {
      await client.hset(key, field, JSON.stringify(value));
    } catch (error) {}
  },

  async getAll(key) {
    try {
      const data = await client.hgetall(key);

      const parsedData = {};

      Object.entries(data).forEach(([k, v]) => {
        if (v && v.trim() !== "") {
          try {
            parsedData[k] = JSON.parse(v);
          } catch (err) {
            console.error("Invalid JSON for key", k, v);
          }
        }
      });
      return Object.keys(parsedData).length ? parsedData : null;
    } catch (error) {
      console.log("Error", error);
    }
  },

  async del(key, field) {
    try {
      await client.hdel(key, field);
    } catch (error) {
      console.log("Error in Deleting", error);
    }
  },

  async delAll(key, field = null) {
    try {
      if (field) {
        await client.hdel(key, field);
      } else {
        await client.del(key);
      }
    } catch (error) {
      console.error("Redis DEL/HDEL Error:", error);
    }
  },
};
