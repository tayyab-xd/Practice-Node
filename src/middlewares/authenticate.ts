import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE } from "../constants/auth.js";
import { forbidden, unauthorized, createAppError } from "../errors/appError.js";
import { verifyToken, type TokenPayload } from "../services/token.service.js";

// "Authorization: Bearer <token>" first (mobile and API clients), then the
// httpOnly cookie (browsers).
function extractToken(req: Request): string | null {
  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim() || null;
  }

  const cookieToken: unknown = req.cookies[AUTH_COOKIE];
  return typeof cookieToken === "string" && cookieToken !== "" ? cookieToken : null;
}

// Express 5 forwards errors thrown from a middleware to the error handler,
// so no try/catch is needed here.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    throw unauthorized("Authentication required");
  }

  const payload = verifyToken(token); // throws 401 on a bad or expired token

  // A user with 2FA enabled gets a token with two_factor_verified: false
  // until the second step is done. Until then it must not open normal routes.
  if (payload.two_factor_active && !payload.two_factor_verified) {
    throw createAppError(403, "TWO_FACTOR_REQUIRED", "Two-factor verification required");
  }

  req.auth = payload;
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.is_admin) {
    throw forbidden("Admin access required");
  }
  next();
}

// Use this in controllers to read the tenant context safely, instead of
// writing `req.auth!`. Example: const { business_id } = getAuth(req);
export function getAuth(req: Request): TokenPayload {
  if (!req.auth) {
    throw unauthorized("Authentication required");
  }
  return req.auth;
}
