import express, { Request, Response } from "express";
import { extractToken } from "../middleware/extractToken";
import { prisma } from "../lib/prisma";

const conversationRouter = express.Router();

conversationRouter.post(
  "/create",
  extractToken,
  async (req: Request, res: Response) => {
    try {
      const { userId, mode, title } = req.body;

      const conversation = await prisma.conversation.create({
        data: {
          userId,
          mode,
          title: title || `New ${mode} conversation`,
        },
        include: {
          messages: true,
        },
      });

      return res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create conversation" });
    }
  },
);

conversationRouter.get(
  "/find",
  extractToken,
  async (req: Request, res: Response) => {
    try {
      const { conversationId, userId } = req.body;

      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      return res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to find conversation" });
    }
  },
);

export default conversationRouter;
