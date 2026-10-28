import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { validationError } from "../errors/appError.js";

interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

type Location = keyof ValidationSchemas;

interface FieldIssue {
  location: Location;
  path: string;
  message: string;
}

// In Express 5, `req.query` is a read-only getter, so `req.query = x` fails.
// defineProperty replaces it with a plain value; it works the same for
// body and params, so one helper covers all three.
function setRequestValue(req: Request, location: Location, value: unknown): void {
  Object.defineProperty(req, location, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const issues: FieldIssue[] = [];

    for (const location of ["params", "query", "body"] as const) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = await schema.safeParseAsync(req[location]);

      if (result.success) {
        // Replace the raw input with the parsed output, so coerced values
        // (e.g. "5" -> 5) and defaults reach the controller, and unknown
        // keys are stripped.
        setRequestValue(req, location, result.data);
      } else {
        for (const issue of result.error.issues) {
          issues.push({
            location,
            path: issue.path.map(String).join("."),
            message: issue.message,
          });
        }
      }
    }

    if (issues.length > 0) {
      next(validationError(issues));
      return;
    }

    next();
  };
}
