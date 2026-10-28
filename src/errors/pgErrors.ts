import { createAppError, type AppError } from "./appError.js";

// The fields we use from a pg DatabaseError. `code` is the 5-character
// SQLSTATE, e.g. "23505" for a unique violation.
interface PgErrorLike {
  code: string;
  severity: string;
  message: string;
  constraint?: string;
  column?: string;
}

// Node system errors (ECONNREFUSED...) also have a `code`, but only
// errors that came from Postgres itself have a `severity`.
function isPgError(err: unknown): err is PgErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    "severity" in err &&
    typeof (err as { code?: unknown }).code === "string"
  );
}

// Returns an AppError for Postgres errors we understand, or null so the
// error falls through to the generic 500. The original error is kept as
// `cause` for logging. Raw DB messages and row values are not sent to the
// client, except for errors you raise yourself (P0001 below).
export function mapPgError(err: unknown): AppError | null {
  if (!isPgError(err)) return null;

  switch (err.code) {
    case "23505": // unique_violation
      return createAppError(
        409,
        "DUPLICATE_RECORD",
        "A record with these values already exists",
        { constraint: err.constraint },
        err,
      );

    case "23503": // foreign_key_violation
      return createAppError(
        409,
        "REFERENCE_VIOLATION",
        "Operation conflicts with related records",
        { constraint: err.constraint },
        err,
      );

    case "23502": // not_null_violation
      return createAppError(
        400,
        "MISSING_VALUE",
        "A required value is missing",
        { column: err.column },
        err,
      );

    case "23514": // check_violation
      return createAppError(
        400,
        "CHECK_VIOLATION",
        "A value is not allowed",
        { constraint: err.constraint },
        err,
      );

    case "22P02": // invalid_text_representation (e.g. "abc" for an integer)
    case "22003": // numeric_value_out_of_range
    case "22001": // string_data_right_truncation
      return createAppError(400, "INVALID_INPUT", "A value has an invalid format", undefined, err);

    case "57014": // query_canceled (statement_timeout)
      return createAppError(
        503,
        "DB_TIMEOUT",
        "The database took too long to respond",
        undefined,
        err,
      );

    case "P0001": // raise_exception: RAISE EXCEPTION '...' in your PL/pgSQL functions
      // You wrote this message yourself, so it is safe to show to the client.
      return createAppError(422, "BUSINESS_RULE_VIOLATION", err.message, undefined, err);

    default:
      return null;
  }
}
