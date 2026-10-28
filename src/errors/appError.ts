// An operational error: something we expected could go wrong (bad input,
// missing row, duplicate key) and that is safe to describe to the client.
// Plain object + factory functions, no classes.
export interface AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: true;
  details?: unknown;
}

export function createAppError(
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
  cause?: unknown,
): AppError {
  const error = new Error(message, cause === undefined ? undefined : { cause });

  const appError = Object.assign(error, {
    name: "AppError",
    statusCode,
    code,
    isOperational: true as const,
  }) as AppError;

  if (details !== undefined) {
    appError.details = details;
  }

  return appError;
}

// Type guard used by the error middleware to tell expected errors
// from unexpected ones (bugs), which must never leak details.
export function isAppError(err: unknown): err is AppError {
  return (
    err instanceof Error &&
    "isOperational" in err &&
    (err as { isOperational?: unknown }).isOperational === true
  );
}

// "Subclasses" as plain factory functions.
export const badRequest = (message = "Bad request", details?: unknown) =>
  createAppError(400, "BAD_REQUEST", message, details);

export const validationError = (details: unknown, message = "Validation failed") =>
  createAppError(400, "VALIDATION_ERROR", message, details);

export const unauthorized = (message = "Unauthorized") =>
  createAppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "Forbidden") => createAppError(403, "FORBIDDEN", message);

export const notFound = (message = "Resource not found") =>
  createAppError(404, "NOT_FOUND", message);

export const conflict = (message = "Conflict", details?: unknown) =>
  createAppError(409, "CONFLICT", message, details);
