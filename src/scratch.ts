import { closePool } from './config/db.js';
import { executeFunction } from './utils/executeFunction.js';

const id = Number(process.argv[2]);
const rows = await executeFunction<Record<string, unknown>>('vouchers_fn_select_complete_details', [id]);
console.log('rows:', rows.length);
for (const [key, value] of Object.entries(rows[0] ?? {})) {
  console.log(key, typeof value, value);
}

await closePool();