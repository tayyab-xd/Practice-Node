import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env.js";
import { login } from "../services/auth.service.js";
import { getClientContext } from "../utils/clientContext.js";
import type { LoginBody } from "../validators/auth.validator.js";

import { AUTH_COOKIE } from "../constants/auth.js";
import { getAuth } from "../middlewares/authenticate.js";

const isProduction = env.NODE_ENV === "production";

// Shared by login and logout: a cookie can only be cleared with the same
// path / sameSite / secure it was set with.
const cookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript in the browser can't read it, which blocks token theft via XSS
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

export async function loginHandler(req: Request, res: Response): Promise<void> {
  // Already validated and parsed by validate({ body: loginBodySchema }).
  const body = req.body as LoginBody;

  const result = await login(body, getClientContext(req));

  res.cookie(AUTH_COOKIE, result.token, {
    ...cookieOptions,
    maxAge: env.JWT_EXPIRES_IN_SECONDS * 1000,
  });

  res.status(200).json({
    success: true,
    // Also returned in the body for non-browser clients such as a mobile app.
    token: result.token,
    requires_2fa: result.requires_2fa,
    message: result.requires_2fa ? "2FA verification required" : "Login successful",
    user: result.user,
  });
}

export function logoutHandler(_req: Request, res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
  res.json({ success: true, message: "Logged out successfully" });
}

// Returns what is in the verified token (no DB call): handy for checking
// that authentication and the tenant context work.
export function meHandler(req: Request, res: Response): void {
  const { user_id, user_email, business_id, is_admin, role_ids } = getAuth(req);
  res.json({ user_id, email: user_email, business_id, is_admin, role_ids });
}
