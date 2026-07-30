import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
