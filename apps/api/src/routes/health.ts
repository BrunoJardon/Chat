/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check the API status
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: La API está disponible.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;