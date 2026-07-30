import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: required("JWT_SECRET", "dev_secret_change_me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",

  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "PayBack Pro <no-reply@paybackpro.local>",
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? "",
    smsFrom: process.env.TWILIO_SMS_FROM ?? "",
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  },

  appUrl: process.env.APP_URL || process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.CLIENT_URL || null,
  frontendUrl: process.env.APP_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:3000",
};
