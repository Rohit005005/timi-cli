import express, { Request, Response } from "express";
import { extractToken } from "../middleware/extractToken";
import { prisma } from "../lib/prisma";

const messageRouter = express.Router();

messageRouter.post(
  "/add",
  extractToken,
  async (req: Request, res: Response) => {
    try {
      const { conversationId, role, content } = req.body;
      const contentStr =
        typeof content === "string" ? content : JSON.stringify(content);
      const message = await prisma.message.create({
        data: {
          conversationId,
          role,
          content: contentStr,
        },
      });

      return res.json(message);
    } catch (error) {
      console.log("Error adding message: ", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  },
);

messageRouter.get(
  "/find/:conversationId",
  extractToken,
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        return res.status(400).json({ error: "Missing conversation ID" });
      }

      const messages = await prisma.message.findMany({
        where: {
          conversationId,
        },
        orderBy: { createdAt: "asc" },
      });

      return res.json(
        messages.map((msg) => ({
          ...msg,
          content: msg.content,
        })),
      );
    } catch (error) {
      console.log("Error finding messages: ", error);
      res.status(500).json({ error: "Failed to find messages" });
    }
  },
);

export default messageRouter;
