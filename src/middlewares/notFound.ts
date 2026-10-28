import type { Request, Response, NextFunction } from "express";
import { notFound } from "../errors/appError.js";

// Runs only when no route matched. It doesn't respond itself,
// it forwards a 404 AppError to the error handler.
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
