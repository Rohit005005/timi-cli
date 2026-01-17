import { URL } from "../../commands/auth/login";
import { getStoredToken } from "../../lib/token";

export type createConversationType = {
  mode: string;
  title?: string | null;
};

export type getOrCreateConversationType = {
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
    mode = "chat",
    title = null,
  }: createConversationType) {
    const token = await getStoredToken();

    const response = await fetch(`${URL}/api/conversation/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        title,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error || "Failed to create conversation");
    }

    return await response.json();
  }

  async getOrCreateConversation({
    conversationId = null,
    mode = "chat",
  }: getOrCreateConversationType) {
    if (conversationId) {
      const token = await getStoredToken();

      const response = await fetch(
        `${URL}/api/conversation/find/${conversationId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error || "Failed to find conversation");
      }

      if (response) return await response.json();
    }

    return this.createConversation({ mode });
  }

  async addMessage({ conversationId, role, content }: addMessageType) {
    const token = await getStoredToken();

    const response = await fetch(`${URL}/api/message/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
        role,
        content,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error || "Failed to add message");
    }

    if (response) return await response.json();
  }

  async getMessages({ conversationId }: getMessagesType) {
    const token = await getStoredToken();

    const response = await fetch(`${URL}/api/message/find/${conversationId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error || "Failed to find conversation");
    }

    if (response) return await response.json();
  }

  async getUserConversation() {
    const token = await getStoredToken();

    const response = await fetch(`${URL}/api/conversation/findAll`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error || "Failed to find user conversations");
    }

    if (response) return await response.json();
  }

  async deleteConversation({ conversationId }: deleteConversationType) {
    const token = await getStoredToken();

    const response = await fetch(`${URL}/api/conversation/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error || "Failed to delete conversation");
    }

    if (response) return await response.json();
  }

  async updateTitle({ conversationId, title }: updateTitleType) {
    const token = await getStoredToken();

    const response = await fetch(`${URL}/api/conversation/update`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
        title,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error || "Failed to update conversation");
    }

    if (response) return await response.json();
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
