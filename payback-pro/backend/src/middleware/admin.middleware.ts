import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth.middleware";
import { ApiError } from "../utils/apiError";
import { prisma } from "../prisma/client";
import { env } from "../config/env";

export async function isAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(ApiError.unauthorized("Authentication required"));
  }

  try {
    const globalSettings = await prisma.globalSettings.findUnique({ where: { id: "global" } });
    const adminEmail = globalSettings?.adminEmail || process.env.ADMIN_EMAIL || "admin@paybackpro.com";

    if (req.user.email !== adminEmail) {
      return next(ApiError.forbidden("Administrator access required"));
    }
    
    next();
  } catch (err) {
    next(ApiError.internal("Error verifying admin access"));
  }
}
