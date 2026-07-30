import twilio from "twilio";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { NotificationChannel, ReminderPayload, ChannelResult } from "../notification.types";

// LIVE CHANNEL: sends SMS via Twilio. Requires a Twilio phone number capable of SMS.
// Swap this implementation for Fast2SMS/MSG91 if targeting India-only SMS routes -
// the NotificationChannel interface stays the same either way.
function getClient() {
  if (!env.twilio.accountSid || !env.twilio.authToken) return null;
  return twilio(env.twilio.accountSid, env.twilio.authToken);
}

export const smsChannel: NotificationChannel = {
  name: "SMS",
  async send(payload: ReminderPayload): Promise<ChannelResult> {
    if (!payload.borrowerPhone) {
      return { channel: "SMS", status: "FAILED", response: "Borrower has no phone number on file" };
    }
    const client = getClient();
    if (!client || !env.twilio.smsFrom) {
      return { channel: "SMS", status: "FAILED", response: "Twilio SMS not configured (.env)" };
    }

    try {
      const body = `${payload.message} Amount due: ₹${payload.amountDue}${
        payload.dueDate ? ` (Due ${payload.dueDate.toDateString()})` : ""
      }`;
      const msg = await client.messages.create({
        from: env.twilio.smsFrom,
        to: normalizePhone(payload.borrowerPhone),
        body,
      });
      logger.info("SMS reminder sent", { to: payload.borrowerPhone, sid: msg.sid });
      return { channel: "SMS", status: "SUCCESS", response: msg.sid };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown SMS error";
      logger.error("SMS reminder failed", { to: payload.borrowerPhone, error: message });
      return { channel: "SMS", status: "FAILED", response: message };
    }
  },
};

function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone.replace(/\D/g, "")}`;
}
