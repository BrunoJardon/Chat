import { OpenApiGeneratorV31, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { HealthResponseSchema } from "@chat/shared/schemas";

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
      description: "La API está disponible.",
    },
  },
  summary: "Check the API status",
  tags: ["Health"],
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
