import bcrypt from "bcrypt";
import { createAppError, type AppError } from "../errors/appError.js";
import {
  checkSubscription,
  findLoginUser,
  insertLoginLog,
  type LoginLogInput,
  type LoginStatus,
  type PgInterval,
} from "../repositories/auth.repository.js";
import type { LoginBody } from "../validators/auth.validator.js";
import type { ClientContext } from "../utils/clientContext.js";
import { clearAttempts, getLockStatus, recordFailedAttempt } from "../utils/loginLockout.js";
import { signToken } from "./token.service.js";

export interface LoginUser {
  user_id: number;
  business_id: number;
  language_id: number;
  rtl: boolean;
  full_name: string | null;
  native_name: string;
  email: string;
  mobile: string | null;
  business_address: string | null;
  is_admin: boolean;
  business_name: string | null;
  business_logo: string | null;
  country_id: number | null;
  currency_code: string | null;
  utc_offset: string | null;
  time_zone_iana: string | null;
  roles: number[];
  two_factor_active: boolean;
  subscription_days_left: number | null;
}

export interface LoginResult {
  token: string;
  requires_2fa: boolean;
  user: LoginUser;
}

const invalidCredentials = (): AppError =>
  createAppError(401, "INVALID_CREDENTIALS", "Invalid credentials");

// The DB statuses that block a login, each mapped to its HTTP error.
const BLOCKED_STATUS_ERRORS: Record<
  Exclude<LoginStatus, "OK" | "INVALID_CREDENTIALS">,
  () => AppError
> = {
  EMAIL_NOT_VERIFIED: () =>
    createAppError(403, "EMAIL_NOT_VERIFIED", "Email address is not verified."),
  USER_INACTIVE: () =>
    createAppError(403, "USER_INACTIVE", "Account is inactive. Contact administrator."),
  BUSINESS_INACTIVE: () => createAppError(403, "BUSINESS_INACTIVE", "Business is inactive."),
};

// When the user doesn't exist there's no hash to compare against. Comparing
// against a throwaway hash keeps the response time the same, so timing
// doesn't reveal which emails exist. Use the same cost as your real hashes
// (10 is the usual default).
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash("not-a-real-password", 10);
  return dummyHash;
}

// A failed log insert must never block a login, so errors are only logged.
async function logAttempt(input: LoginLogInput): Promise<void> {
  try {
    await insertLoginLog(input);
  } catch (err) {
    console.error("Login log error:", err);
  }
}

// The DB returns utc_offset as a pg interval object ({ hours: 4 }).
// Convert it to "+04:00".
function formatUtcOffset(interval: PgInterval | null): string | null {
  if (!interval) return null;
  const totalMinutes = (interval.hours ?? 0) * 60 + (interval.minutes ?? 0);
  const sign = totalMinutes < 0 ? "-" : "+";
  const abs = Math.abs(totalMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

export async function login(input: LoginBody, ctx: ClientContext): Promise<LoginResult> {
  const { email, password, business_id: businessId } = input;

  // 1. Locked out?
  const lock = getLockStatus(email, businessId);
  if (lock.isLocked) {
    throw createAppError(429, "ACCOUNT_LOCKED", "Too many failed attempts. Try again later.", {
      retry_after_seconds: lock.retryAfterSeconds,
    });
  }

  // 2. One DB call; it always returns exactly one row.
  const row = await findLoginUser(email, businessId);
  if (!row) {
    throw new Error("users_fn_login returned no row"); // a bug: becomes a generic 500
  }

  // 3. Unknown user or wrong business. There's no user_id, so nothing to log.
  if (row.status_code === "INVALID_CREDENTIALS") {
    await bcrypt.compare(password, await getDummyHash());
    recordFailedAttempt(email, businessId);
    throw invalidCredentials();
  }

  // 4. Known user, but blocked (unverified / inactive user / inactive business).
  if (row.status_code !== "OK") {
    await logAttempt({ businessId, userId: row.user_id, email, ctx, success: false });
    throw BLOCKED_STATUS_ERRORS[row.status_code]();
  }

  // 5. Status OK: the row now has the real ids and the password hash.
  const userId = Number(row.user_id);
  const tenantId = Number(row.business_id);
  if (!Number.isInteger(userId) || !Number.isInteger(tenantId)) {
    throw new Error("users_fn_login returned an OK row without user_id/business_id");
  }

  const passwordMatches = row.password !== null && (await bcrypt.compare(password, row.password));

  if (!passwordMatches) {
    recordFailedAttempt(email, businessId);
    await logAttempt({ businessId: tenantId, userId, email, ctx, success: false });
    throw invalidCredentials();
  }

  // 6. Subscription must be active.
  const subscription = await checkSubscription(tenantId);
  if (subscription?.is_active !== true) {
    await logAttempt({ businessId: tenantId, userId, email, ctx, success: false });
    throw createAppError(403, "SUBSCRIPTION_EXPIRED", "Subscription expired.");
  }

  // 7. Success: reset the lockout counter and issue the token.
  clearAttempts(email, businessId);

  const roleIds = (row.roles ?? []).map(Number).filter(Number.isInteger);
  const twoFactorActive = Boolean(row.two_factor_active);
  const isAdmin = Boolean(row.is_admin);

  const token = signToken({
    user_id: userId,
    user_email: row.email ?? email,
    business_id: tenantId,
    is_admin: isAdmin,
    role_ids: roleIds,
    two_factor_active: twoFactorActive,
    two_factor_verified: !twoFactorActive,
  });

  await logAttempt({ businessId: tenantId, userId, email, ctx, success: true });

  return {
    token,
    requires_2fa: twoFactorActive,
    user: {
      user_id: userId,
      business_id: tenantId,
      // Hardcoded in your old backend; move these to the DB later.
      language_id: 1,
      rtl: false,
      native_name: "pashto",
      full_name: row.full_name,
      email: row.email ?? email,
      mobile: row.mobile,
      business_address: row.business_address,
      is_admin: isAdmin,
      business_name: row.business_name,
      business_logo: row.business_logo,
      country_id: row.country_id,
      currency_code: row.currency_code?.trim() ?? null, // char column is space-padded
      utc_offset: formatUtcOffset(row.utc_offset),
      time_zone_iana: row.time_zone_iana,
      roles: roleIds,
      two_factor_active: twoFactorActive,
      subscription_days_left:
        subscription.days_left === null ? null : Number(subscription.days_left),
    },
  };
}
