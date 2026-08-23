import { OpenApiGeneratorV31, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { authResponseSchema, loginRequestSchema, registerRequestSchema } from "@chat/shared/auth";
import { HealthResponseSchema } from "@chat/shared/schemas";
import { userResponseSchema } from "@chat/shared/user";
import { z } from "zod";

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: "get",
  path: "/health",
  responses: {
    "200": {
      content: {
        "application/json": {
          schema: HealthResponseSchema,
        },
      },
      description: "The API is available.",
    },
  },
  summary: "Check the API status",
  tags: ["Health"],
});

const registerCreatedResponseSchema = z.object({ user: userResponseSchema });

const validationErrorResponseSchema = z.object({
  errors: z.object({
    fields: z.record(z.string(), z.array(z.string())),
    form: z.array(z.string()),
  }),
});

const conflictResponseSchema = z.object({
  field: z.enum(["email", "username"]),
  message: z.string(),
});

registry.registerPath({
  method: "post",
  path: "/auth/register",
  request: {
    body: {
      content: {
        "application/json": {
          schema: registerRequestSchema,
        },
      },
      description: "Registration data.",
    },
  },
  responses: {
    "201": {
      content: {
        "application/json": {
          schema: registerCreatedResponseSchema,
        },
      },
      description: "User created.",
    },
    "400": {
      content: {
        "application/json": {
          schema: validationErrorResponseSchema,
        },
      },
      description: "Validation failed.",
    },
    "409": {
      content: {
        "application/json": {
          schema: conflictResponseSchema,
        },
      },
      description: "Email or username already in use.",
    },
  },
  summary: "Register a new user",
  tags: ["Auth"],
});

const unauthorizedResponseSchema = z.object({ message: z.string() });

registry.registerPath({
  method: "post",
  path: "/auth/login",
  request: {
    body: {
      content: {
        "application/json": {
          schema: loginRequestSchema,
        },
      },
      description: "Login credentials. Identifier accepts an email address or a username.",
    },
  },
  responses: {
    "200": {
      content: {
        "application/json": {
          schema: authResponseSchema,
        },
      },
      description: "Authenticated.",
    },
    "400": {
      content: {
        "application/json": {
          schema: validationErrorResponseSchema,
        },
      },
      description: "Validation failed.",
    },
    "401": {
      content: {
        "application/json": {
          schema: unauthorizedResponseSchema,
        },
      },
      description: "Invalid credentials.",
    },
  },
  summary: "Log in with email or username",
  tags: ["Auth"],
});

export const swaggerSpec = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  info: {
    description: "REST API del proyecto Chat",
    title: "Chat API",
    version: "0.0.1",
  },
  openapi: "3.1.0",
  servers: [{ url: "/api" }],
});
