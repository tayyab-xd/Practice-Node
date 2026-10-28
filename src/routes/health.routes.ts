import { Router } from "express";
import { getHealth, readiness } from "../controllers/health.controller.js";

export const healthRouter = Router();

healthRouter.get("/", getHealth);
healthRouter.get("/ready", readiness);
