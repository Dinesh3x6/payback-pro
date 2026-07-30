import cron from "node-cron";
import { prisma } from "../../prisma/client";
import { logger } from "../../config/logger";
import { dispatchReminder } from "./reminder.service";

// Runs every minute: finds SCHEDULED reminders whose time has come, sends them,
// and re-schedules the next occurrence for recurring reminders.
export function startReminderScheduler() {
  cron.schedule("* * * * *", async () => {
    const due = await prisma.reminder.findMany({
      where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    });

    for (const reminder of due) {
      try {
        await dispatchReminder(reminder.id, undefined, true);
        logger.info("Scheduled reminder dispatched", { reminderId: reminder.id });

        if (reminder.recurring) {
          const next = nextOccurrence(reminder.scheduledAt ?? new Date(), reminder.recurring);
          await prisma.reminder.create({
            data: {
              borrowerId: reminder.borrowerId,
              loanId: reminder.loanId,
              channels: reminder.channels,
              subject: reminder.subject,
              message: reminder.message,
              recurring: reminder.recurring,
              status: "SCHEDULED",
              scheduledAt: next,
            },
          });
        }
      } catch (err) {
        logger.error("Scheduled reminder failed", { reminderId: reminder.id, error: (err as Error).message });
        await prisma.reminder.update({ where: { id: reminder.id }, data: { status: "FAILED" } });
      }
    }
  });

  logger.info("Reminder scheduler started (checks every minute)");
}

function nextOccurrence(from: Date, recurring: string): Date {
  const next = new Date(from);
  if (recurring === "DAILY") next.setDate(next.getDate() + 1);
  else if (recurring === "WEEKLY") next.setDate(next.getDate() + 7);
  else if (recurring === "MONTHLY") next.setMonth(next.getMonth() + 1);
  return next;
}
