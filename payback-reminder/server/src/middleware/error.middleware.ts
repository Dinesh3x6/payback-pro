import { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Prisma unique constraint violation
  if (err?.code === "P2002") {
    return res.status(409).json({ error: `Duplicate value for field: ${err.meta?.target}` });
  }
  // Prisma record not found
  if (err?.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  return res.status(500).json({ error: "Internal server error" });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}
