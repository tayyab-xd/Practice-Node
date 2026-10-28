import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { loginBodySchema } from "../validators/auth.validator.js";
import { loginHandler, logoutHandler, meHandler } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

export const authRouter = Router();

authRouter.post("/login", validate({ body: loginBodySchema }), loginHandler);
authRouter.post("/logout", logoutHandler);
authRouter.get("/me", authenticate, meHandler);
