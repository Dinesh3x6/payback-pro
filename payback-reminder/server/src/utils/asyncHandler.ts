import { NextFunction, Request, Response } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/** Wraps an async Express handler so thrown errors reach errorHandler middleware. */
export function asyncHandler(fn: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
