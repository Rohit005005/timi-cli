import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import "dotenv/config";
import express from "express";
import { auth } from "./lib/auth";
import cors from "cors";
import userRouter from "./routes/user.route";
import conversationRouter from "./routes/conversation.route";

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

// app.get("/api/me", async (req, res) => {
//   const session = await auth.api.getSession({
//     headers: fromNodeHeaders(req.headers),
//   });
//   return res.json(session);
// });

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/device", async (req, res) => {
  const { user_code } = req.query;
  res.redirect(`http://localhost:3000/device?user_code=${user_code}`);
});

app.get("/", (req, res) => {
  res.json({
    message: "chal rhaa !!",
  });
});

app.use("/api", userRouter);

app.use("/api/conversation", conversationRouter);

app.listen(PORT, () => {
  console.log(`Server running on ${PORT} !!`);
});
