import express from "express";
import { healthRouter } from "./routes/health.routes.js";
import { notFoundHandler } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";

export function createApp() {
  const app = express();
  app.use(cookieParser());

  app.disable("x-powered-by");
  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
