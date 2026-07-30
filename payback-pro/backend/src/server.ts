import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { startReminderScheduler } from "./modules/reminder/reminder.scheduler";

const app = createApp();

app.listen(env.port, () => {
  logger.info(`PayBack Pro API listening on http://localhost:${env.port}`);
  startReminderScheduler();
});
