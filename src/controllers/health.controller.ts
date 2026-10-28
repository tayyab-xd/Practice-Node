import type { Request, Response } from "express";
import { checkDatabase } from "../services/health.service.js";

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

export async function readiness(_req: Request, res: Response): Promise<void> {
  const dbUp = await checkDatabase();

  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? "ready" : "not_ready",
    checks: { database: dbUp ? "up" : "down" },
  });
}
