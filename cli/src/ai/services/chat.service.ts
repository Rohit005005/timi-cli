import { prisma } from "../../../lib/prisma";
import { getStoredToken } from "../../lib/token";

export type createConversationType = {
  userId: string;
  mode: string;
  title?: string | null;
};

export type getOrCreateConversationType = {
  userId: string;
  mode: string;
  conversationId: string | null;
};

export type addMessageType = {
  conversationId: string;
  role: string;
  content: string;
};

export type getMessagesType = {
  conversationId: string;
};

export type deleteConversationType = {
  conversationId: string;
  userId: string;
};

export type getUserConversationType = {
  userId: string;
};

export type updateTitleType = {
  conversationId: string;
  title: string;
};

export type messagesType = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: Date;
};

export class ChatService {
  async createConversation({
    userId,
    mode = "chat",
    title = null,
  }: createConversationType) {
    const token = await getStoredToken();

    const response = await fetch(
      `${process.env.SERVER_URL}/api/conversation/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          mode,
          title,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error || "Failed to create conversation");
    }

    return await response.json();
  }

  async getOrCreateConversation({
    userId,
    conversationId = null,
    mode = "chat",
  }: getOrCreateConversationType) {
    if (conversationId) {
      const token = await getStoredToken();

      const response = await fetch(
        `${process.env.SERVER_URL}/api/conversation/find`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            conversationId,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error || "Failed to find conversation");
      }

      if (response) return await response.json();
    }

    return this.createConversation({ userId, mode });
  }

  async addMessage({ conversationId, role, content }: addMessageType) {
    const contentStr =
      typeof content === "string" ? content : JSON.stringify(content);

    return await prisma.message.create({
      data: {
        conversationId,
        role,
        content: contentStr,
      },
    });
  }

  async getMessages({ conversationId }: getMessagesType) {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: { createdAt: "asc" },
    });

    return messages.map((msg) => ({
      ...msg,
      content: msg.content,
    }));
  }

  async getUserConversation({ userId }: getUserConversationType) {
    return await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async deleteConversation({ conversationId, userId }: deleteConversationType) {
    return await prisma.conversation.deleteMany({
      where: {
        id: conversationId,
        userId,
      },
    });
  }

  async updateTitle({ conversationId, title }: updateTitleType) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        title,
      },
    });
  }

  formatMessagesForAi(messages: messagesType[]) {
    return messages.map((msg) => ({
      role: msg.role,
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
    }));
  }
}
