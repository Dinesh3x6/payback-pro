import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth.middleware";
import * as adminService from "./admin.service";

export const getDashboardStatsHandler = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const stats = await adminService.getDashboardStats();
  res.json({ success: true, data: stats });
});

export const getUsersHandler = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const users = await adminService.getUsers();
  res.json({ success: true, data: users });
});

export const updateUserStatusHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = await adminService.updateUserStatus(id, status);
  res.json({ success: true, data: user });
});

export const resetUserPasswordHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  await adminService.resetUserPassword(id, newPassword);
  res.json({ success: true, message: "Password reset successfully" });
});

export const deleteUserHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await adminService.deleteUser(id);
  res.json({ success: true, message: "User deleted" });
});

export const getSessionsHandler = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const sessions = await adminService.getSessions();
  res.json({ success: true, data: sessions });
});

export const terminateSessionHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await adminService.terminateSession(id);
  res.json({ success: true, message: "Session terminated" });
});

export const getAnalyticsHandler = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const analytics = await adminService.getAnalytics();
  res.json({ success: true, data: analytics });
});

export const getGlobalSettingsHandler = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const settings = await adminService.getGlobalSettings();
  res.json({ success: true, data: settings });
});

export const updateGlobalSettingsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await adminService.updateGlobalSettings(req.body);
  res.json({ success: true, data: settings });
});
