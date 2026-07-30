import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    // Fail fast in production; allow local dev to proceed with warnings
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.warn(`[env] Missing environment variable: ${name}`);
    return "";
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:3000",

  databaseUrl: required("DATABASE_URL"),

  authProvider: (process.env.AUTH_PROVIDER ?? "local") as "local" | "clerk" | "firebase",
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",

  emailProvider: (process.env.EMAIL_PROVIDER ?? "resend") as "resend" | "nodemailer",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "PayBack Reminder <reminders@example.com>",

  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },

  reminderCron: process.env.REMINDER_CRON ?? "0 9 * * *",

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 200),
  },
};
