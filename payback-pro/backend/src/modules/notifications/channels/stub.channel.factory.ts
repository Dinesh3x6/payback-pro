import { NotificationChannel, ChannelName, ReminderPayload, ChannelResult } from "../notification.types";

// Factory for channels that are architecturally wired up (routes, DB, UI checkbox all work)
// but whose real network call isn't implemented yet. Calling send() returns a clear
// "not configured" result instead of silently failing or crashing.
//
// TO ACTIVATE A STUB (e.g. Telegram):
//  1. Add credentials to .env (see comments below per channel)
//  2. Replace the body of send() with a real API call, following email/whatsapp/sms as examples
//  3. Nothing else changes - notification.service.ts already routes to this file
export function makeStubChannel(name: ChannelName, howToActivate: string): NotificationChannel {
  return {
    name,
    async send(_payload: ReminderPayload): Promise<ChannelResult> {
      return {
        channel: name,
        status: "FAILED",
        response: `${name} channel is not yet activated. ${howToActivate}`,
      };
    },
  };
}

export const telegramChannel = makeStubChannel(
  "TELEGRAM",
  "Create a bot via @BotFather, set TELEGRAM_BOT_TOKEN in .env, and call the Telegram Bot API sendMessage endpoint with the borrower's chat id."
);

export const pushChannel = makeStubChannel(
  "PUSH",
  "Wire up Firebase Cloud Messaging: store device tokens per borrower/user and call admin.messaging().send()."
);

export const desktopChannel = makeStubChannel(
  "DESKTOP",
  "This channel is triggered from the frontend using the browser Notification API - no backend call needed. See frontend/lib/desktopNotify.ts."
);

export const inAppChannel = makeStubChannel(
  "IN_APP",
  "Write a Notification row to the database and have the frontend poll or subscribe (e.g. via WebSocket) to display it in the bell icon."
);

export const discordChannel = makeStubChannel(
  "DISCORD",
  "Create a Discord Incoming Webhook (Server Settings > Integrations), set DISCORD_WEBHOOK_URL in .env, and POST { content: message } to it."
);

export const slackChannel = makeStubChannel(
  "SLACK",
  "Create a Slack Incoming Webhook, set SLACK_WEBHOOK_URL in .env, and POST { text: message } to it."
);

export const teamsChannel = makeStubChannel(
  "TEAMS",
  "Create a Teams Incoming Webhook connector, set TEAMS_WEBHOOK_URL in .env, and POST an Adaptive Card / MessageCard payload to it."
);

export const qrChannel = makeStubChannel(
  "QR",
  "Not a delivery channel by itself - generate a UPI/payment QR with the 'qrcode' npm package and attach it as an image to the Email/WhatsApp/Telegram send instead."
);
