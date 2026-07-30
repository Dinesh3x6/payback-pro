import { prisma } from "../../prisma/client";
import { ApiError } from "../../utils/apiError";

interface BorrowerInput {
  name: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  tags?: string[];
  notes?: string;
}

export async function listBorrowers(userId: string, search?: string) {
  return prisma.borrower.findMany({
    where: {
      userId,
      NOT: {
        tags: { has: "archived" }
      },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { 
      loans: { include: { repayments: true } },
      payments: true
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBorrower(userId: string, id: string) {
  const borrower = await prisma.borrower.findFirst({
    where: { id, userId },
    include: {
      loans: { include: { repayments: true } },
      reminders: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!borrower) throw ApiError.notFound("Borrower not found");
  return borrower;
}

export async function createBorrower(userId: string, input: BorrowerInput) {
  return prisma.borrower.create({ data: { ...input, userId } });
}

export async function updateBorrower(userId: string, id: string, input: Partial<BorrowerInput>) {
  await getBorrower(userId, id); // ensures ownership + existence
  return prisma.borrower.update({ where: { id }, data: input });
}

export async function deleteBorrower(userId: string, id: string, mode: "archive" | "permanent" = "permanent") {
  const borrower = await prisma.borrower.findFirst({
    where: { id, userId },
    include: {
      loans: { include: { repayments: true } },
      payments: true,
      reminders: true
    }
  });
  if (!borrower) throw ApiError.notFound("Borrower not found");

  if (mode === "archive") {
    // Add "archived" tag to soft delete
    const updatedTags = Array.from(new Set([...borrower.tags, "archived"]));
    const updated = await prisma.borrower.update({
      where: { id },
      data: { tags: updatedTags }
    });
    return { success: true, action: "archived", message: "Borrower archived successfully.", data: updated };
  }

  // Permanent Delete Mode
  const activeLoans = borrower.loans.filter(l => l.status !== "PAID");
  const hasActiveLoans = activeLoans.length > 0;
  
  if (hasActiveLoans) {
    throw ApiError.badRequest("Cannot delete borrower because active loans exist.");
  }

  // Execute database transaction to handle all related records safely
  await prisma.$transaction(async (tx) => {
    // 1. Delete payments
    await tx.payment.deleteMany({ where: { borrowerId: id } });
    
    // 2. Delete reminders
    await tx.reminder.deleteMany({ where: { borrowerId: id } });
    
    // 3. Delete repayments for borrower's loans
    const loanIds = borrower.loans.map(l => l.id);
    await tx.repayment.deleteMany({ where: { loanId: { in: loanIds } } });
    
    // 4. Delete loans
    await tx.loan.deleteMany({ where: { borrowerId: id } });
    
    // 5. Delete borrower
    await tx.borrower.delete({ where: { id } });
  });

  return { success: true, action: "deleted", message: "Borrower deleted successfully." };
}
