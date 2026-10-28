import type { Request, Response, NextFunction } from "express";
import { createAppError, isAppError, type AppError } from "../errors/appError.js";
import { mapPgError } from "../errors/pgErrors.js";

// Errors thrown by Express itself (e.g. express.json) aren't AppErrors,
// so translate the ones we recognise into AppErrors.
function normalizeError(err: unknown): AppError | null {
  if (isAppError(err)) return err;

  const pgError = mapPgError(err);
  if (pgError) return pgError;

  if (typeof err === "object" && err !== null && "type" in err) {
    const type = (err as { type?: unknown }).type;

    if (type === "entity.parse.failed") {
      return createAppError(400, "INVALID_JSON", "Request body is not valid JSON");
    }
    if (type === "entity.too.large") {
      return createAppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
    }
  }

  return null; // unexpected: a bug
}

// Express recognises an error handler by its 4 parameters, so keep all 4
// even though `_next` is unused.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // If the response already started, we can't send JSON. Let Express close it.
  if (res.headersSent) {
    _next(err);
    return;
  }

  const appError = normalizeError(err);

  if (appError) {
    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details !== undefined && { details: appError.details }),
      },
    });
    return;
  }

  // Unexpected error: log everything, tell the client nothing.
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    },
  });
}
