import { NextFunction, Request, Response } from "express";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Wraps async route handlers so rejected promises are forwarded to Express error middleware
export const asyncHandler = (fn: AsyncFn) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
