import { prisma } from "../../../lib/prisma";

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
    return await prisma.conversation.create({
      data: {
        userId,
        mode,
        title: title || `New ${mode} conversation`,
      },
      include: { messages: true },
    });
  }

  async getOrCreateConversation({
    userId,
    conversationId = null,
    mode = "chat",
  }: getOrCreateConversationType) {
    if (conversationId) {
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

      if (conversation) return conversation;
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
