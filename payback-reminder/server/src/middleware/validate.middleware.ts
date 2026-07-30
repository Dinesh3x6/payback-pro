import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";

type Target = "body" | "query" | "params";

/**
 * Validates req[target] against a Zod schema. On failure, responds with 400
 * and a structured list of field errors. On success, replaces req[target]
 * with the parsed (and coerced/defaulted) value.
 */
export function validate(schema: AnyZodObject, target: Target = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[target]);
      (req as any)[target] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
        });
      }
      next(err);
    }
  };
}
