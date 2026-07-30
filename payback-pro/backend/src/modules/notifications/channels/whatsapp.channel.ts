import twilio from "twilio";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { NotificationChannel, ReminderPayload, ChannelResult } from "../notification.types";

// LIVE CHANNEL: sends WhatsApp messages via Twilio's WhatsApp API.
// Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env.
// In Twilio Sandbox mode the recipient must first opt in by messaging the sandbox number.
function getClient() {
  if (!env.twilio.accountSid || !env.twilio.authToken) return null;
  return twilio(env.twilio.accountSid, env.twilio.authToken);
}

export const whatsappChannel: NotificationChannel = {
  name: "WHATSAPP",
  async send(payload: ReminderPayload): Promise<ChannelResult> {
    if (!payload.borrowerPhone) {
      return { channel: "WHATSAPP", status: "FAILED", response: "Borrower has no phone number on file" };
    }
    const client = getClient();
    if (!client || !env.twilio.whatsappFrom) {
      return { channel: "WHATSAPP", status: "FAILED", response: "Twilio WhatsApp not configured (.env)" };
    }

    try {
      const body = `${payload.message}\n\nAmount due: ₹${payload.amountDue}${
        payload.dueDate ? `\nDue: ${payload.dueDate.toDateString()}` : ""
      }`;
      const msg = await client.messages.create({
        from: env.twilio.whatsappFrom,
        to: `whatsapp:${normalizePhone(payload.borrowerPhone)}`,
        body,
      });
      logger.info("WhatsApp reminder sent", { to: payload.borrowerPhone, sid: msg.sid });
      return { channel: "WHATSAPP", status: "SUCCESS", response: msg.sid };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown WhatsApp error";
      logger.error("WhatsApp reminder failed", { to: payload.borrowerPhone, error: message });
      return { channel: "WHATSAPP", status: "FAILED", response: message };
    }
  },
};

function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone.replace(/\D/g, "")}`;
}
