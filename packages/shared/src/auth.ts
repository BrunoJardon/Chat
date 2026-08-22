import { z } from "zod";

import type { UserResponse } from "./message.js";

export const registerRequestSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .meta({ description: "User first name", examples: ["Ada"] }),
  lastName: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .meta({ description: "User last name", examples: ["Lovelace"] }),
  email: z
    .email()
    .meta({ description: "User email address", examples: ["ada@example.com"] }),
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, "Must be 3-20 alphanumeric characters")
    .meta({ description: "Unique username", examples: ["ada"] }),
  password: z
    .string()
    .min(8)
    .meta({ description: "Plain password, minimum 8 characters" }),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}
