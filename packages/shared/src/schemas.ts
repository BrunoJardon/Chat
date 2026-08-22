import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z
    .string()
    .meta({ description: "API availability indicator", examples: ["ok"] }),
  timestamp: z.iso
    .datetime()
    .meta({ description: "Server response timestamp" }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
