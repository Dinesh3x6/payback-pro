import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { logger } from "../config/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error(err.message, { stack: err.stack });
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  const message = err instanceof Error ? err.message : "Unexpected error";
  logger.error(message, { stack: err instanceof Error ? err.stack : undefined });

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
