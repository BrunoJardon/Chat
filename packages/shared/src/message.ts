import type { MessageStatus } from "./enums.js";

export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  avatar: string | null;
  createdAt: string;
}

export interface MessagePayload {
  conversationId: string;
  content: string;
  replyToId?: string;
}

export interface MessageResponse {
  id: string;
  content: string;
  sender: UserResponse;
  conversationId: string;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  status: MessageStatus;
  replyTo?: MessageResponse;
}
