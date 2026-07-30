import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { prisma } from "@/config/prisma";
import { AppError } from "@/middleware/error.middleware";

const SALT_ROUNDS = 12;

export async function signup(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("An account with this email already exists", 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, authProvider: "local" },
  });

  return { user, token: issueToken(user.id) };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) throw new AppError("Invalid email or password", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid email or password", 401);

  return { user, token: issueToken(user.id) };
}

export function issueToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function sanitizeUser(user: { id: string; name: string; email: string; upiId: string | null; theme: string }) {
  return { id: user.id, name: user.name, email: user.email, upiId: user.upiId, theme: user.theme };
}
