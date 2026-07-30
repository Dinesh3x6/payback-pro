import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ApiError } from "../utils/apiError";

// Validates req.body against a Zod schema; on failure, forwards a 400 ApiError with details
export function validateBody(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(ApiError.badRequest("Validation failed", err.flatten()));
      }
      next(err);
    }
  };
}
