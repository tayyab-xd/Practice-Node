import type { QueryResult, QueryResultRow } from "pg";
import { pool } from "../config/db.js";

// Anything that can run a query: the pool, or a client inside a transaction.
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
}

// Function names are put into the SQL text, so only allow safe names.
const FUNCTION_NAME = /^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$/i;

export async function executeFunction<T extends QueryResultRow = QueryResultRow>(
  fnName: string,
  params: unknown[] = [],
  executor: Queryable = pool,
): Promise<T[]> {
  if (!FUNCTION_NAME.test(fnName)) {
    throw new Error(`Invalid database function name: ${fnName}`);
  }

  const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `SELECT * FROM ${fnName}(${placeholders})`;

  const result = await executor.query<T>(sql, params);
  return result.rows;
}
