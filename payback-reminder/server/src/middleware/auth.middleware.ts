import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { prisma } from "@/config/prisma";

export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Verifies the bearer token on the request and attaches `userId`.
 *
 * - AUTH_PROVIDER=local  -> verifies our own signed JWT (see auth.service.ts)
 * - AUTH_PROVIDER=clerk  -> verify the Clerk session token via @clerk/backend
 *   (kept as a clearly-marked extension point below so the team can drop in
 *   their Clerk secret key without restructuring the app)
 * - AUTH_PROVIDER=firebase -> verify Firebase ID token via firebase-admin
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const token = header.slice("Bearer ".length);

    if (env.authProvider === "local") {
      const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return res.status(401).json({ error: "User not found" });
      req.userId = user.id;
      return next();
    }

    if (env.authProvider === "clerk") {
      // Extension point: verify with Clerk's backend SDK, e.g.
      //   import { verifyToken } from "@clerk/backend";
      //   const claims = await verifyToken(token, { secretKey: env.clerkSecretKey });
      //   then look up / upsert the local User by claims.sub (externalId)
      return res.status(501).json({
        error: "Clerk verification not wired up. Install @clerk/backend and implement verification here.",
      });
    }

    if (env.authProvider === "firebase") {
      // Extension point: verify with firebase-admin, e.g.
      //   import { getAuth } from "firebase-admin/auth";
      //   const decoded = await getAuth().verifyIdToken(token);
      //   then look up / upsert the local User by decoded.uid (externalId)
      return res.status(501).json({
        error: "Firebase verification not wired up. Install firebase-admin and implement verification here.",
      });
    }

    return res.status(500).json({ error: "Unsupported AUTH_PROVIDER configuration" });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
