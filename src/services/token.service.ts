import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { createAppError, unauthorized } from "../errors/appError.js";

// The shape of everything we put in the token. This is also the tenant
// context that `authenticate` will attach to each request later.
const tokenPayloadSchema = z.object({
  user_id: z.number().int(),
  user_email: z.string(),
  business_id: z.number().int(),
  is_admin: z.boolean(),
  role_ids: z.array(z.number().int()),
  two_factor_active: z.boolean(),
  two_factor_verified: z.boolean(),
});

export type TokenPayload = z.infer<typeof tokenPayloadSchema>;

const ALGORITHM = "HS256";

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
  });
}

export function verifyToken(token: string): TokenPayload {
  let decoded: string | jwt.JwtPayload;

  try {
    // Pinning `algorithms` stops a forged token from choosing its own
    // algorithm (e.g. "none").
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      // A separate code lets the frontend tell "log in again" from "bad token".
      throw createAppError(401, "TOKEN_EXPIRED", "Token has expired");
    }
    throw unauthorized("Invalid token");
  }

  // A valid signature doesn't guarantee the payload has the shape we expect
  // (for example, a token issued by an older version of the app).
  const parsed = tokenPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw unauthorized("Invalid token");
  }

  return parsed.data;
}
