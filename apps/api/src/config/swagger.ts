import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
  definition: {
    info: {
      description: "REST API del proyecto Chat",
      title: "Chat API",
      version: "0.0.1",
    },
    openapi: "3.1.0",
    servers: [
      {
        url: "/api",
      },
    ],
  },
});
