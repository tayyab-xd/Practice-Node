import pg from "pg";
import { env } from "./env.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
});

// Without this handler, an error on an idle connection crashes the process.
pool.on("error", (err) => {
  console.error("Unexpected error on idle database client:", err);
});

export async function closePool(): Promise<void> {
  await pool.end();
}
