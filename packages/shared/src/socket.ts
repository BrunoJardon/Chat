import type { MessagePayload, MessageResponse } from "./message.js";

export interface ServerToClientEvents {
  "message:new": (message: MessageResponse) => void;
  "message:typing": (data: { conversationId: string; userId: string }) => void;
  "message:read": (data: { messageId: string; userId: string }) => void;
}

export interface ClientToServerEvents {
  "message:new": (payload: MessagePayload, callback: (message: MessageResponse) => void) => void;
  "message:typing": (data: { conversationId: string }) => void;
  "message:read": (data: { messageId: string }) => void;
  "conversation:join": (data: { conversationId: string }) => void;
  "conversation:leave": (data: { conversationId: string }) => void;
}
