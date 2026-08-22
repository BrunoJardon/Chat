import { z } from "zod";

export const userResponseSchema = z.object({
  id: z.uuid().meta({ description: "User unique identifier" }),
  firstName: z.string().meta({ description: "User first name" }),
  lastName: z.string().meta({ description: "User last name" }),
  email: z.email().meta({ description: "User email address" }),
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]+$/)
    .meta({ description: "Unique username" }),
  avatar: z.union([z.url(), z.null()]).meta({ description: "Avatar URL" }),
  createdAt: z.iso
    .datetime()
    .meta({ description: "Account creation timestamp" }),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
