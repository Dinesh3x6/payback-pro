import { Response } from "express";
import * as authService from "@/services/auth.service";
import { AuthedRequest } from "@/middleware/auth.middleware";
import { prisma } from "@/config/prisma";

export async function signupHandler(req: AuthedRequest, res: Response) {
  const { name, email, password } = req.body;
  const { user, token } = await authService.signup(name, email, password);
  res.status(201).json({ user: authService.sanitizeUser(user), token });
}

export async function loginHandler(req: AuthedRequest, res: Response) {
  const { email, password } = req.body;
  const { user, token } = await authService.login(email, password);
  res.json({ user: authService.sanitizeUser(user), token });
}

export async function meHandler(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  res.json({ user: authService.sanitizeUser(user) });
}

export async function updateProfileHandler(req: AuthedRequest, res: Response) {
  const { name, upiId, theme } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(upiId !== undefined ? { upiId } : {}),
      ...(theme !== undefined ? { theme } : {}),
    },
  });
  res.json({ user: authService.sanitizeUser(user) });
}
