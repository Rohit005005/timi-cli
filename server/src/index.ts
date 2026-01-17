/// <reference path="./types/express.d.ts" />
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import "dotenv/config";
import express from "express";
import { auth } from "./lib/auth";
import cors from "cors";
import userRouter from "./routes/user.route";
import conversationRouter from "./routes/conversation.route";
import messageRouter from "./routes/message.route";

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/device", async (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/device`);
});

app.get("/", (req, res) => {
  res.json({
    message: "chal rhaa !!",
  });
});

app.use("/api", userRouter);

app.use("/api/conversation", conversationRouter);

app.use("/api/message", messageRouter);

app.listen(PORT, () => {
  console.log(`Server running on ${PORT} !!`);
});
