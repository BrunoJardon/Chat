import { z } from "zod";

import { userResponseSchema } from "./user.js";

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

export const loginRequestSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .meta({
      description: "Email address or username",
      examples: ["ada@example.com"],
    }),
  password: z.string().min(1).meta({ description: "Plain password" }),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string().meta({ description: "Short-lived JWT access token" }),
  refreshToken: z.string().meta({ description: "Opaque refresh token" }),
  user: userResponseSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
