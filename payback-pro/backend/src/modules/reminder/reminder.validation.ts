import { z } from "zod";

export const channelEnum = z.enum([
  "EMAIL",
  "WHATSAPP",
  "SMS",
  "TELEGRAM",
  "PUSH",
  "DESKTOP",
  "IN_APP",
  "DISCORD",
  "SLACK",
  "TEAMS",
  "QR",
]);

export const createReminderSchema = z.object({
  borrowerId: z.string().uuid(),
  loanId: z.string().uuid().optional(),
  channels: z.array(channelEnum).min(1, "Select at least one channel"),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  scheduledAt: z.string().datetime().optional(),
  recurring: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
});

export const sendNowSchema = z.object({
  borrowerId: z.string().uuid(),
  loanId: z.string().uuid().optional(),
  channels: z.array(channelEnum).min(1),
  subject: z.string().optional(),
  message: z.string().min(1),
  amountDue: z.number().nonnegative().optional(),
});
