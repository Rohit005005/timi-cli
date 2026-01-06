import express, { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { extractToken } from "../middleware/extractToken";

const userRouter = express.Router();

userRouter.get("/user", extractToken, async (req: Request, res: Response) => {
  try {
    if (!req.token) return res.status(401).json({ error: "No token" });
    const user = await prisma.user.findFirst({
      where: {
        sessions: {
          some: {
            token: req.token,
          },
        },
      },
      select: {
        name: true,
        email: true,
        image: true,
      },
    });

    if (!user) return res.status(401).json({ error: "Invalid session" });

    return res.json(user);
  } catch (error) {
    console.log("Error finding user: ", error);
    res
      .status(500)
      .json({ error: "Server error: failed to get user from db !!" });
  }
});

userRouter.get(
  "/clientId",
  extractToken,
  async (req: Request, res: Response) => {
    try {
      const clientId = process.env.GITHUB_CLIENT_ID;
      res.json(clientId);
    } catch (error) {
      console.log("Error finding cliend id: ", error);
      res.status(500).json({ error: "Server error: failed to get client id" });
    }
  },
);

export default userRouter;
