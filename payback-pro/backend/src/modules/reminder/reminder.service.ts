import { prisma } from "../../prisma/client";
import { Prisma } from "@prisma/client";
import QRCode from "qrcode";
import { ApiError } from "../../utils/apiError";
import { logger } from "../../config/logger";
import { env } from "../../config/env";
import { createOrder } from "../payment/payment.service";
import { sendThroughChannels } from "../notifications/notification.service";
import { ChannelName, ReminderPayload } from "../notifications/notification.types";

interface CreateReminderInput {
  borrowerId: string;
  loanId?: string;
  channels: ChannelName[];
  subject?: string;
  message: string;
  scheduledAt?: string;
  recurring?: "DAILY" | "WEEKLY" | "MONTHLY";
}

async function assertBorrowerOwnership(userId: string, borrowerId: string) {
  const borrower = await prisma.borrower.findFirst({ where: { id: borrowerId, userId } });
  if (!borrower) throw ApiError.notFound("Borrower not found");
  return borrower;
}

async function getReminderOrThrow(userId: string, id: string) {
  const reminder = await prisma.reminder.findFirst({
    where: { id, borrower: { userId } },
  });
  if (!reminder) throw ApiError.notFound("Reminder not found");
  return reminder;
}

// Creates a reminder. If scheduledAt is omitted it is sent immediately; otherwise it
// is left PENDING/SCHEDULED for the cron scheduler to pick up.
export async function createReminder(userId: string, input: CreateReminderInput, frontendUrlOverride?: string) {
  await assertBorrowerOwnership(userId, input.borrowerId);

  let loanId = input.loanId;
  if (loanId) {
    const loan = await prisma.loan.findFirst({
      where: { id: loanId, borrowerId: input.borrowerId }
    });
    if (!loan) throw ApiError.notFound("Loan not found or does not belong to borrower");
  } else {
    const activeLoan = await prisma.loan.findFirst({
      where: { borrowerId: input.borrowerId, status: { not: "PAID" } },
      orderBy: { createdAt: "desc" }
    });
    if (activeLoan) {
      loanId = activeLoan.id;
    }
  }

  const reminder = await prisma.reminder.create({
    data: {
      borrowerId: input.borrowerId,
      loanId: loanId,
      channels: input.channels,
      subject: input.subject,
      message: input.message,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      recurring: input.recurring,
      status: input.scheduledAt ? "SCHEDULED" : "PENDING",
    },
  });

  if (!input.scheduledAt) {
    return dispatchReminder(reminder.id, undefined, false, frontendUrlOverride);
  }
  return reminder;
}

// Immediately sends a one-off reminder (the "Send Reminder Now" button) without
// necessarily persisting a Reminder record first - useful for ad-hoc messages.
export async function sendNow(userId: string, input: {
  borrowerId: string;
  loanId?: string;
  channels: ChannelName[];
  subject?: string;
  message: string;
  amountDue?: number;
}, frontendUrlOverride?: string) {
  const borrower = await assertBorrowerOwnership(userId, input.borrowerId);

  let loanId = input.loanId;
  if (loanId) {
    const loan = await prisma.loan.findFirst({
      where: { id: loanId, borrowerId: input.borrowerId }
    });
    if (!loan) throw ApiError.notFound("Loan not found or does not belong to borrower");
  } else {
    const activeLoan = await prisma.loan.findFirst({
      where: { borrowerId: input.borrowerId, status: { not: "PAID" } },
      orderBy: { createdAt: "desc" }
    });
    if (activeLoan) {
      loanId = activeLoan.id;
    }
  }

  const reminder = await prisma.reminder.create({
    data: {
      borrowerId: input.borrowerId,
      loanId: loanId,
      channels: input.channels,
      subject: input.subject,
      message: input.message,
      status: "PENDING",
    },
  });

  return dispatchReminder(reminder.id, input.amountDue, false, frontendUrlOverride);
}

// ──────────────────────────────────────────────────────────────────
// PLACEHOLDERS REPLACER HELPER
// ──────────────────────────────────────────────────────────────────
function replacePlaceholders(message: string, data: {
  borrowerName: string;
  amount: number;
  dueDate: string;
  loanId: string;
}): string {
  let result = message;
  
  const placeholders = [
    { keys: ["{{borrowerName}}", "{borrowerName}", "{{name}}", "{name}"], value: data.borrowerName },
    { keys: ["{{amount}}", "{amount}"], value: data.amount.toString() },
    { keys: ["{{dueDate}}", "{dueDate}"], value: data.dueDate },
    { keys: ["{{loanId}}", "{loanId}"], value: data.loanId }
  ];

  for (const item of placeholders) {
    for (const key of item.keys) {
      result = result.split(key).join(item.value);
    }
  }

  return result;
}

// QR CODE GENERATOR FOR EXACT PAYMENT URL
// ──────────────────────────────────────────────────────────────────
async function generateQrCode(url: string): Promise<string | null> {
  if (!url || url === "#") {
    return null;
  }
  try {
    const qrCodeBase64 = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: "#1e40af", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    logger.info("QR code generated for payment URL", { url });
    return qrCodeBase64;
  } catch (err) {
    logger.warn("Failed to generate QR code", { error: (err as Error).message });
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────
// CORE DISPATCH
// ──────────────────────────────────────────────────────────────────
export async function dispatchReminder(reminderId: string, amountDueOverride?: number, isAutomated: boolean = false, frontendUrlOverride?: string) {
  const reminder = await prisma.reminder.findUniqueOrThrow({
    where: { id: reminderId },
    include: { borrower: true, loan: { include: { repayments: true } } },
  });

  let loan = reminder.loan;
  if ((!loan || loan.status === "PAID") && amountDueOverride === undefined) {
    const activeLoan = await prisma.loan.findFirst({
      where: { borrowerId: reminder.borrowerId, status: { not: "PAID" } },
      include: { repayments: true },
      orderBy: { createdAt: "desc" },
    });
    if (activeLoan) {
      loan = activeLoan;
    }
  }

  let amountDue = amountDueOverride ?? 0;
  if (loan) {
    const principal = loan.principal;
    const interestRate = loan.interestRate;
    const interest = principal.mul(interestRate).div(100);
    const paid = loan.repayments.reduce(
      (s, r) => s.add(r.amount),
      new Prisma.Decimal(0)
    );
    const totalDue = principal.add(interest).sub(paid);
    amountDue = totalDue.greaterThan(0) ? totalDue.toNumber() : 0;

    // Check if fully paid (settled)
    if (totalDue.lessThanOrEqualTo(0)) {
      if (isAutomated) {
        // Cancel automated reminder
        const updated = await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "CANCELLED" },
        });
        logger.info("Cancelled automated reminder because loan is fully paid", { reminderId });
        return { reminder: updated, results: [] };
      }
    }
  }

  // Determine channels
  const channels = reminder.channels as ChannelName[];
  
  // Format due date for placeholders
  const formattedDueDate = loan?.dueDate
    ? new Date(loan.dueDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not specified";

  // Replace placeholders inside the message before sending
  const cleanMessage = replacePlaceholders(reminder.message, {
    borrowerName: reminder.borrower.name,
    amount: amountDue,
    dueDate: formattedDueDate,
    loanId: loan?.id || "—"
  });

  // Links & QR Code Generation (only if sending via EMAIL)
  let qrCodeBase64: string | null = null;
  let upiLink: string | null = null;
  let paymentLink: string | null = null;
  
  if (channels.includes("EMAIL")) {
    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || "PayBackPro";
    if (upiId && amountDue > 0) {
      const ref = `RP_${reminder.id.replace(/-/g, "").substring(0, 12)}`; // Payment Reference
      const note = `Loan Payment - Borrower: ${reminder.borrower.name.substring(0, 20)} - Loan: ${loan ? loan.id.substring(0, 8) : "N/A"}`;
      upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amountDue.toFixed(2)}&tn=${encodeURIComponent(note)}&tr=${encodeURIComponent(ref)}&cu=INR`;
    }

    if (loan && amountDue > 0) {
      const appUrl = env.appUrl;
      if (!appUrl) {
        logger.error(
          "Configuration Error: The public application URL environment variable (APP_URL, PUBLIC_APP_URL, NEXT_PUBLIC_APP_URL, or CLIENT_URL) is missing or undefined! Cannot generate absolute payment URL."
        );
      } else if (!appUrl.startsWith("http://") && !appUrl.startsWith("https://")) {
        logger.error(
          `Configuration Error: Configured public application URL "${appUrl}" is invalid. It must be an absolute URL starting with http:// or https://`
        );
      } else {
        try {
          const orderResult = await createOrder(loan.id, reminder.borrowerId);
          paymentLink = `${appUrl}/pay/${orderResult.payment.razorpayOrderId}`;
        } catch (err) {
          logger.warn("Failed to create Razorpay order during dispatch", { error: (err as Error).message });
        }
      }
    }

    if (upiLink && amountDue > 0) {
      qrCodeBase64 = await generateQrCode(upiLink);
    }
  }

  // Debugging requirement: Log all details before sending
  logger.info("Email Reminder Debugging Telemetry", {
    borrower: reminder.borrower.name,
    loanId: loan?.id || "N/A",
    outstandingAmount: amountDue,
    generatedPaymentUrl: paymentLink || "N/A",
    generatedQrUrl: paymentLink || upiLink || "N/A",
  });

  const payload: ReminderPayload = {
    borrowerName: reminder.borrower.name,
    borrowerEmail: reminder.borrower.email,
    borrowerPhone: reminder.borrower.phone,
    amountDue,
    dueDate: loan?.dueDate ?? null,
    subject: reminder.subject,
    message: cleanMessage,
    qrCodeBase64,
    upiLink,
    paymentLink,
    loanId: loan?.id ?? null,
    loanAmount: loan?.principal ? Number(loan.principal) : null,
    interestRate: loan?.interestRate ? Number(loan.interestRate) : null,
    reminderDate: new Date(),
  };

  const results = await sendThroughChannels(channels, payload);

  // Determine per-channel retry counts
  const historyData = results.map((r) => ({
    reminderId: reminder.id,
    channel: r.channel,
    status: r.status,
    response: r.response,
    retryCount: r.status === "FAILED" ? MAX_RETRIES_LOGGED : 0,
  }));

  await prisma.reminderHistory.createMany({ data: historyData });

  const allFailed = results.every((r) => r.status === "FAILED");
  const status = allFailed ? "FAILED" : "SENT";

  const updated = await prisma.reminder.update({
    where: { id: reminder.id },
    data: { status },
  });

  // If any channel failed, log a warning with the exact reasons
  const failedResults = results.filter((r) => r.status === "FAILED");
  if (failedResults.length > 0) {
    logger.warn("Some channels failed during dispatch", {
      reminderId,
      failures: failedResults.map((r) => ({ channel: r.channel, reason: r.response })),
    });
  }

  return { reminder: updated, results };
}

// Constant for retry count tracking in history
const MAX_RETRIES_LOGGED = 3;

export async function listReminders(userId: string, borrowerId?: string) {
  return prisma.reminder.findMany({
    where: { borrower: { userId }, ...(borrowerId && { borrowerId }) },
    include: { history: { orderBy: { sentAt: "desc" } }, borrower: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function pauseReminder(userId: string, id: string) {
  await getReminderOrThrow(userId, id);
  return prisma.reminder.update({ where: { id }, data: { status: "PAUSED" } });
}

export async function resumeReminder(userId: string, id: string) {
  await getReminderOrThrow(userId, id);
  return prisma.reminder.update({ where: { id }, data: { status: "SCHEDULED" } });
}

export async function cancelReminder(userId: string, id: string) {
  await getReminderOrThrow(userId, id);
  return prisma.reminder.update({ where: { id }, data: { status: "CANCELLED" } });
}

export async function getHistory(userId: string, reminderId: string) {
  await getReminderOrThrow(userId, reminderId);
  return prisma.reminderHistory.findMany({
    where: { reminderId },
    orderBy: { sentAt: "desc" },
  });
}
