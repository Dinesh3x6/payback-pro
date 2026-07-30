import { prisma } from "../../prisma/client";
import { logger } from "../../config/logger";
import { ChannelName, ChannelResult, NotificationChannel, ReminderPayload } from "./notification.types";
import { emailChannel } from "./channels/email.channel";
import { whatsappChannel } from "./channels/whatsapp.channel";
import { smsChannel } from "./channels/sms.channel";
import {
  telegramChannel,
  pushChannel,
  desktopChannel,
  inAppChannel,
  discordChannel,
  slackChannel,
  teamsChannel,
  qrChannel,
} from "./channels/stub.channel.factory";

// Registry: every channel name maps to one implementation of NotificationChannel.
// This is the single place that needs updating when a stub becomes live.
const registry: Record<ChannelName, NotificationChannel> = {
  EMAIL: emailChannel,
  WHATSAPP: whatsappChannel,
  SMS: smsChannel,
  TELEGRAM: telegramChannel,
  PUSH: pushChannel,
  DESKTOP: desktopChannel,
  IN_APP: inAppChannel,
  DISCORD: discordChannel,
  SLACK: slackChannel,
  TEAMS: teamsChannel,
  QR: qrChannel,
};

// Sends a reminder through every requested channel in parallel and returns per-channel results.
export async function sendThroughChannels(
  channels: ChannelName[],
  payload: ReminderPayload
): Promise<ChannelResult[]> {
  const results = await Promise.all(
    channels.map(async (name) => {
      const channel = registry[name];
      if (!channel) {
        return { channel: name, status: "FAILED" as const, response: "Unknown channel" };
      }
      const result = await channel.send(payload);
      await logToHistory(result, payload);
      return result;
    })
  );
  return results;
}

async function logToHistory(result: ChannelResult, payload: ReminderPayload) {
  try {
    await prisma.notificationHistory.create({
      data: {
        channel: result.channel,
        recipient: payload.borrowerEmail || payload.borrowerPhone || payload.borrowerName,
        message: payload.message,
        status: result.status,
        response: result.response,
      },
    });

    if (result.channel === "EMAIL") {
      await prisma.emailLog.create({
        data: {
          to: payload.borrowerEmail ?? "unknown",
          subject: payload.subject ?? "Payment Reminder",
          status: result.status,
          response: result.response,
        },
      });
    } else if (result.channel === "WHATSAPP") {
      await prisma.whatsAppLog.create({
        data: { to: payload.borrowerPhone ?? "unknown", message: payload.message, status: result.status, response: result.response },
      });
    } else if (result.channel === "SMS") {
      await prisma.sMSLog.create({
        data: { to: payload.borrowerPhone ?? "unknown", message: payload.message, status: result.status, response: result.response },
      });
    }
  } catch (err) {
    logger.error("Failed to write notification history", { error: (err as Error).message });
  }
}
