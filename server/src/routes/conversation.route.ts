import express, { Request, Response } from "express";
import { extractToken } from "../middleware/extractToken";
import { prisma } from "../lib/prisma";

const conversationRouter = express.Router();

conversationRouter.post(
  "/create",
  extractToken,
  async (req: Request, res: Response) => {
    try {
      const { mode, title } = req.body;

      if (!req.token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const session = await prisma.session.findUnique({
        where: { token: req.token },
        select: { userId: true },
      });

      if (!session) {
        return res.status(401).json({ error: "Invalid Session" });
      }

      const conversation = await prisma.conversation.create({
        data: {
          userId: session.userId,
          mode,
          title: title || `New ${mode} conversation`,
        },
        include: {
          messages: true,
        },
      });

      return res.json(conversation);
    } catch (error) {
      console.log("Error creating conversation: ", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  },
);

conversationRouter.get(
  "/find:conversationId",
  extractToken,
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        return res.status(400).json({ error: "Missing conversation ID" });
      }

      if (!req.token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const session = await prisma.session.findUnique({
        where: { token: req.token },
        select: { userId: true },
      });

      if (!session) {
        return res.status(401).json({ error: "Invalid Session" });
      }

      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: session.userId,
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
      console.log("Error finding conversation: ", error);
      res.status(500).json({ error: "Failed to find conversation" });
    }
  },
);

conversationRouter.get(
  "/findAll",
  extractToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const session = await prisma.session.findUnique({
        where: { token: req.token as string },
        select: { userId: true },
      });

      if (!session) {
        return res.status(401).json({ error: "Invalid Session" });
      }
      const conversations = await prisma.conversation.findMany({
        where: {
          userId: session.userId,
        },
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      return res.json(conversations);
    } catch (error) {
      console.log("Error finding user conversations: ", error);
      res.status(500).json({ error: "Failed to find user conversations" });
    }
  },
);

conversationRouter.delete(
  "/delete",
  extractToken,
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.body;

      if (!req.token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const session = await prisma.session.findUnique({
        where: { token: req.token },
        select: { userId: true },
      });

      if (!session) {
        return res.status(401).json({ error: "Invalid Session" });
      }

      const conversations = await prisma.conversation.deleteMany({
        where: {
          id: conversationId,
          userId: session.userId,
        },
      });

      return res.json(conversations);
    } catch (error) {
      console.log("Error deleting user conversations: ", error);
      res.status(500).json({ error: "Failed to deleting user conversations" });
    }
  },
);

conversationRouter.put(
  "/update",
  extractToken,
  async (req: Request, res: Response) => {
    try {
      const { conversationId, title } = req.body;

      const conversation = await prisma.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          title,
        },
      });

      return res.json(conversation);
    } catch (error) {
      console.log("Error updating conversation: ", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  },
);

export default conversationRouter;
