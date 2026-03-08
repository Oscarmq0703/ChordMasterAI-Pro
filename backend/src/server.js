import http from "http";
import express from "express";
import cors from "cors";
import { redis } from "./redis.js";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("ChordMasterAI Pro backend is running.");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/redis-test", async (req, res) => {
  try {
    await redis.set("ping", "pong");
    const value = await redis.get("ping");

    res.json({
      ok: true,
      redis: value,
    });
  } catch (error) {
    console.error("Redis test failed:", error);
    res.status(500).json({
      ok: false,
      error: String(error),
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});