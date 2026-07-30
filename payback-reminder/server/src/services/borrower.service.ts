import { Prisma } from "@prisma/client";
import { prisma } from "@/config/prisma";
import { AppError } from "@/middleware/error.middleware";

export interface ListBorrowersOptions {
  userId: string;
  search?: string;
  status?: "PENDING" | "PARTIALLY_PAID" | "PAID";
  overdue?: boolean;
  sortBy: "dueDate" | "amount" | "createdAt" | "name";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

export async function listBorrowers(opts: ListBorrowersOptions) {
  const where: Prisma.BorrowerWhereInput = {
    userId: opts.userId,
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.overdue
      ? { dueDate: { lt: new Date() }, status: { not: "PAID" } }
      : {}),
    ...(opts.search
      ? {
          OR: [
            { name: { contains: opts.search, mode: "insensitive" } },
            { email: { contains: opts.search, mode: "insensitive" } },
            { phone: { contains: opts.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.borrower.findMany({
      where,
      orderBy: { [opts.sortBy]: opts.sortOrder },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
      include: { payments: { orderBy: { paidAt: "desc" } } },
    }),
    prisma.borrower.count({ where }),
  ]);

  return { items, total, page: opts.page, pageSize: opts.pageSize };
}

export async function getBorrowerOrThrow(userId: string, id: string) {
  const borrower = await prisma.borrower.findFirst({
    where: { id, userId },
    include: { payments: { orderBy: { paidAt: "desc" } }, reminderLogs: { orderBy: { sentAt: "desc" }, take: 20 } },
  });
  if (!borrower) throw new AppError("Borrower not found", 404);
  return borrower;
}

export async function createBorrower(userId: string, data: {
  name: string;
  email?: string;
  phone?: string;
  amount: number;
  borrowDate: Date;
  dueDate: Date;
  notes?: string;
  reminderFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "NONE";
}) {
  return prisma.borrower.create({
    data: {
      userId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      amount: data.amount,
      remainingAmount: data.amount,
      borrowDate: data.borrowDate,
      dueDate: data.dueDate,
      notes: data.notes,
      reminderFrequency: data.reminderFrequency,
      status: "PENDING",
    },
  });
}

export async function updateBorrower(userId: string, id: string, data: Record<string, unknown>) {
  await getBorrowerOrThrow(userId, id);
  return prisma.borrower.update({ where: { id }, data });
}

export async function deleteBorrower(userId: string, id: string) {
  await getBorrowerOrThrow(userId, id);
  return prisma.borrower.delete({ where: { id } });
}

/**
 * Records a partial or full payment, recalculates remainingAmount and status,
 * and disables reminders once fully paid.
 */
export async function recordPayment(
  userId: string,
  borrowerId: string,
  input: { amount: number; method: string; note?: string; paidAt?: Date }
) {
  const borrower = await getBorrowerOrThrow(userId, borrowerId);
  const remaining = Number(borrower.remainingAmount);

  if (input.amount > remaining) {
    throw new AppError(
      `Payment amount (₹${input.amount}) exceeds remaining balance (₹${remaining})`,
      400
    );
  }

  const newRemaining = Math.round((remaining - input.amount) * 100) / 100;
  const newStatus = newRemaining <= 0 ? "PAID" : "PARTIALLY_PAID";

  const [payment, updatedBorrower] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        borrowerId,
        amount: input.amount,
        method: (input.method as any) ?? "UPI",
        note: input.note,
        paidAt: input.paidAt ?? new Date(),
      },
    }),
    prisma.borrower.update({
      where: { id: borrowerId },
      data: {
        remainingAmount: newRemaining,
        status: newStatus,
        // Stop reminders automatically once fully paid
        remindersActive: newStatus === "PAID" ? false : borrower.remindersActive,
      },
    }),
  ]);

  return { payment, borrower: updatedBorrower };
}

/** Dashboard aggregate stats for a user. */
export async function getDashboardStats(userId: string) {
  const borrowers = await prisma.borrower.findMany({ where: { userId } });

  const totalLent = borrowers.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalPending = borrowers.reduce((sum, b) => sum + Number(b.remainingAmount), 0);
  const totalRecovered = totalLent - totalPending;
  const now = new Date();
  const overdue = borrowers.filter((b) => b.status !== "PAID" && b.dueDate < now);
  const overdueAmount = overdue.reduce((sum, b) => sum + Number(b.remainingAmount), 0);

  return {
    totalLent: round2(totalLent),
    totalPending: round2(totalPending),
    totalRecovered: round2(totalRecovered),
    overdueCount: overdue.length,
    overdueAmount: round2(overdueAmount),
    borrowerCount: borrowers.length,
    statusBreakdown: {
      pending: borrowers.filter((b) => b.status === "PENDING").length,
      partiallyPaid: borrowers.filter((b) => b.status === "PARTIALLY_PAID").length,
      paid: borrowers.filter((b) => b.status === "PAID").length,
    },
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
