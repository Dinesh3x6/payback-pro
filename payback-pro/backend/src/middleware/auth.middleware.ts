import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { verifyToken, JwtPayload } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

import { prisma } from "../prisma/client";

export async function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or invalid Authorization header"));
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    
    // Check if session is active
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.status !== "ACTIVE") {
      return next(ApiError.unauthorized("Session expired or terminated"));
    }

    // Check if user is disabled
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status === "DISABLED") {
      return next(ApiError.forbidden("User account is disabled"));
    }

    // Update last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() }
    });

    req.user = payload;
    next();
  } catch (err) {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}
