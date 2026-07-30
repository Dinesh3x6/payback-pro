import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth.middleware";
import * as reminderService from "./reminder.service";

export const createHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const origin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : undefined);
  const reminder = await reminderService.createReminder(req.user!.userId, req.body, origin);
  res.status(201).json({ success: true, data: reminder });
});

export const sendNowHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const origin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : undefined);
  const result = await reminderService.sendNow(req.user!.userId, req.body, origin);

  // Check if all channels failed — report as an error with the specific reason
  const allFailed = result.results?.every((r: any) => r.status === "FAILED");
  if (allFailed && result.results?.length > 0) {
    const reasons = result.results
      .filter((r: any) => r.status === "FAILED")
      .map((r: any) => `${r.channel}: ${r.response || "Unknown error"}`)
      .join(" | ");
    res.status(400).json({
      success: false,
      message: reasons,
      data: result,
    });
    return;
  }

  res.status(201).json({ success: true, data: result });
});

export const listHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const borrowerId = typeof req.query.borrowerId === "string" ? req.query.borrowerId : undefined;
  const reminders = await reminderService.listReminders(req.user!.userId, borrowerId);
  res.json({ success: true, data: reminders });
});

export const pauseHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reminder = await reminderService.pauseReminder(req.user!.userId, req.params.id);
  res.json({ success: true, data: reminder });
});

export const resumeHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reminder = await reminderService.resumeReminder(req.user!.userId, req.params.id);
  res.json({ success: true, data: reminder });
});

export const cancelHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reminder = await reminderService.cancelReminder(req.user!.userId, req.params.id);
  res.json({ success: true, data: reminder });
});

export const historyHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const history = await reminderService.getHistory(req.user!.userId, req.params.id);
  res.json({ success: true, data: history });
});
