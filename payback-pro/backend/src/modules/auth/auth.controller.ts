import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth.middleware";
import * as authService from "./auth.service";

export const registerHandler = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const reqMeta = {
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
    browser: req.headers["user-agent"] ? req.headers["user-agent"].split(" ")[0] : "Unknown",
    device: "Desktop", // Simplification
  };
  const result = await authService.register(name, email, password, reqMeta);
  res.status(201).json({ success: true, data: result });
});

export const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const reqMeta = {
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
    browser: req.headers["user-agent"] ? req.headers["user-agent"].split(" ")[0] : "Unknown",
    device: "Desktop", // Simplification
  };
  const result = await authService.login(email, password, reqMeta);
  res.json({ success: true, data: result });
});

export const forgotPasswordHandler = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  // resetToken only exposed here because there's no email/SMTP configured yet in dev.
  res.json({
    success: true,
    message: "If that email exists, a reset link has been generated.",
    devResetToken: result.resetToken,
  });
});

export const resetPasswordHandler = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  res.json({ success: true, message: "Password has been reset successfully" });
});

export const changePasswordHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user!.userId, currentPassword, newPassword);
  res.json({ success: true, message: "Password changed successfully" });
});

export const getProfileHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await authService.getProfile(req.user!.userId);
  res.json({ success: true, data: profile });
});

export const updateProfileHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await authService.updateProfile(req.user!.userId, req.body);
  res.json({ success: true, data: profile });
});
