import crypto from "crypto";
import { prisma } from "../../prisma/client";
import { hashPassword, comparePassword } from "../../utils/password";
import { signToken } from "../../utils/jwt";
import { ApiError } from "../../utils/apiError";
import { logger } from "../../config/logger";

export async function register(name: string, email: string, password: string, reqMeta: { ip?: string; userAgent?: string; browser?: string; device?: string } = {}) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, settings: { create: {} } },
  });

  const globalSettings = await prisma.globalSettings.findUnique({ where: { id: "global" } });
  const adminEmail = globalSettings?.adminEmail || process.env.ADMIN_EMAIL || "admin@paybackpro.com";
  const isAdmin = user.email === adminEmail;

  logger.info("User registered", { userId: user.id });
  const token = signToken({ userId: user.id, email: user.email, isAdmin });

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token,
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
      browser: reqMeta.browser,
      device: reqMeta.device,
    }
  });

  return { token, user: sanitize(user) };
}

export async function login(email: string, password: string, reqMeta: { ip?: string; userAgent?: string; browser?: string; device?: string } = {}) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  if (user.status === "DISABLED") throw ApiError.forbidden("This account has been disabled by the administrator.");

  const globalSettings = await prisma.globalSettings.findUnique({ where: { id: "global" } });
  const adminEmail = globalSettings?.adminEmail || process.env.ADMIN_EMAIL || "admin@paybackpro.com";
  const isAdmin = user.email === adminEmail;

  const token = signToken({ userId: user.id, email: user.email, isAdmin });
  
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token,
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
      browser: reqMeta.browser,
      device: reqMeta.device,
    }
  });

  return { token, user: sanitize(user) };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Do not reveal whether the email exists
  if (!user) return { resetToken: null };

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExp = new Date(Date.now() + 1000 * 60 * 30); // 30 min

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExp },
  });

  // NOTE: In production, email this token to the user instead of returning it.
  logger.info("Password reset requested", { userId: user.id });
  return { resetToken };
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExp: { gt: new Date() } },
  });
  if (!user) throw ApiError.badRequest("Reset token is invalid or has expired");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExp: null },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest("Current password is incorrect");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");
  return sanitize(user);
}

export async function updateProfile(userId: string, data: { name?: string; email?: string }) {
  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== userId) {
      throw ApiError.conflict("Email is already in use by another account");
    }
  }
  const user = await prisma.user.update({ where: { id: userId }, data });
  return sanitize(user);
}

function sanitize(user: { passwordHash: string; [key: string]: unknown }) {
  const { passwordHash, resetToken, resetTokenExp, ...rest } = user;
  return rest;
}
