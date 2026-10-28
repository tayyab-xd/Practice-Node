import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { closePool } from "./config/db.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);

  // Force exit if shutdown hangs.
  const timer = setTimeout(() => {
    console.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  timer.unref();

  server.close(async (err) => {
    try {
      await closePool();
    } catch (poolErr) {
      console.error("Error closing database pool:", poolErr);
    }
    process.exit(err ? 1 : 0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
