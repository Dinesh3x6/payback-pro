import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "@/config/env";
import { errorHandler, notFoundHandler } from "@/middleware/error.middleware";
import { scheduleReminderJob, runReminderSweep } from "@/jobs/reminder.job";

import authRoutes from "@/routes/auth.routes";
import borrowerRoutes from "@/routes/borrower.routes";
import dashboardRoutes from "@/routes/dashboard.routes";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/borrowers", borrowerRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🚀 PayBack Reminder API running on http://localhost:${env.port}`);
  scheduleReminderJob();

    // Temporary test
  runReminderSweep().catch((err) =>
    console.error("[reminder] Manual sweep failed:", err)
  );
});
