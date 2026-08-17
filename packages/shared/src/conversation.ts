import type { ConversationType } from "./enums.js";
import type { UserResponse } from "./message.js";

export interface ConversationCreate {
  type: ConversationType;
  name?: string;
  participantIds: string[];
}

export interface ConversationResponse {
  id: string;
  type: ConversationType;
  name: string | null;
  participants: UserResponse[];
  createdAt: string;
}
