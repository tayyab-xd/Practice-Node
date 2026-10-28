import type { TokenPayload } from "../services/token.service.js";

declare global {
  namespace Express {
    interface Request {
      // Set by the `authenticate` middleware. Undefined on public routes.
      auth?: TokenPayload;
    }
  }
}

export {};
