import type { MessageStatus } from "./enums.js";
import type { UserResponse } from "./user.js";

export type { UserResponse };

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
