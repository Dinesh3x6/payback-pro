import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import net from "net";
import { env } from "./config/env";
import { logger } from "./config/logger";
import apiRoutes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({
    limit: "5mb",
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    }
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );

  app.use("/api", apiRoutes);

  app.get("/api/test-smtp", (req, res) => {
    const host = "smtp-relay.brevo.com";
    const port = 587;
    const timeout = 10000;

    logger.info("TCP SMTP Connection Test Initiated", { host, port, timeout });

    let completed = false;
    const socket = net.createConnection({ host, port });
    socket.setTimeout(timeout);

    socket.on("connect", () => {
      if (completed) return;
      completed = true;
      socket.destroy();
      logger.info("TCP SMTP Connection Success", { host, port });
      res.json({ success: true, message: "SMTP server is reachable" });
    });

    socket.on("timeout", () => {
      if (completed) return;
      completed = true;
      socket.destroy();
      logger.warn("TCP SMTP Connection Timeout", { host, port, timeout });
      res.json({ success: false, error: "Connection timed out" });
    });

    socket.on("error", (err: any) => {
      if (completed) return;
      completed = true;
      socket.destroy();
      logger.error("TCP SMTP Connection Socket Error", {
        host,
        port,
        code: err.code,
        message: err.message,
      });
      res.json({
        success: false,
        code: err.code || "UNKNOWN",
        message: err.message || "Unknown socket error",
      });
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
