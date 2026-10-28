import type { QueryResultRow } from "pg";
import { executeFunction } from "../utils/executeFunction.js";
import type { ClientContext } from "../utils/clientContext.js";

export type LoginStatus =
  "OK" | "INVALID_CREDENTIALS" | "EMAIL_NOT_VERIFIED" | "USER_INACTIVE" | "BUSINESS_INACTIVE";

export interface PgInterval {
  hours?: number;
  minutes?: number;
}

// Column types are a first guess from your old controller. pg returns
// bigint columns as strings, hence `string | number`. The test below prints
// the real row so we can tighten these.
export interface LoginRow extends QueryResultRow {
  status_code: LoginStatus;
  user_id: string | null; // bigint comes back as a string
  business_id: string | null;
  email: string | null;
  password: string | null; // bcrypt hash
  full_name: string | null;
  mobile: string | null;
  is_admin: boolean | null;
  roles: Array<string | number> | null;
  two_factor_active: boolean | null;
  business_name: string | null;
  business_address: string | null;
  business_logo: string | null;
  country_id: number | null;
  currency_code: string | null; // char column, padded with spaces: trim before use
  utc_offset: PgInterval | null;
  time_zone_iana: string | null;
}

// users_fn_login always returns exactly one row (status_code says what happened).
export async function findLoginUser(
  email: string,
  businessId: number,
): Promise<LoginRow | undefined> {
  const rows = await executeFunction<LoginRow>("users_fn_login", [email, businessId]);
  return rows[0];
}

export interface SubscriptionRow extends QueryResultRow {
  is_active: boolean | null;
  days_left: string | number | null; // first guess: the test below shows the real type
}

export async function checkSubscription(businessId: number): Promise<SubscriptionRow | undefined> {
  const rows = await executeFunction<SubscriptionRow>("subscriptions_fn_check", [businessId]);
  return rows[0];
}

export interface LoginLogInput {
  businessId: string | number | null;
  userId: string | number | null;
  email: string;
  ctx: ClientContext;
  success: boolean;
}

// Argument order matches login_log_fn_insert exactly.
export async function insertLoginLog(input: LoginLogInput): Promise<void> {
  const { ctx } = input;
  await executeFunction("login_log_fn_insert", [
    input.businessId,
    input.userId,
    input.email,
    ctx.ip_address,
    ctx.browser_name,
    ctx.os_name,
    ctx.device_type,
    ctx.user_agent,
    input.success,
  ]);
}
