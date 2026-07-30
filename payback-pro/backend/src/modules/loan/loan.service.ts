import { prisma } from "../../prisma/client";
import { ApiError } from "../../utils/apiError";
import { Prisma } from "@prisma/client";
import { Response } from "express";
import PDFDocument from "pdfkit";

interface LoanInput {
  borrowerId: string;
  principal: number;
  interestRate?: number;
  type?: "LENT" | "BORROWED";
  installments?: number;
  dueDate?: string;
}

async function assertBorrowerOwnership(userId: string, borrowerId: string) {
  const borrower = await prisma.borrower.findFirst({ where: { id: borrowerId, userId } });
  if (!borrower) throw ApiError.notFound("Borrower not found");
}

export async function createLoan(userId: string, input: LoanInput) {
  await assertBorrowerOwnership(userId, input.borrowerId);
  return prisma.loan.create({
    data: {
      borrowerId: input.borrowerId,
      principal: new Prisma.Decimal(input.principal),
      interestRate: new Prisma.Decimal(input.interestRate ?? 0),
      type: input.type ?? "LENT",
      installments: input.installments ?? 1,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    },
  });
}

export async function updateLoan(userId: string, id: string, input: Partial<LoanInput>) {
  const loan = await getLoanOrThrow(userId, id);
  return prisma.loan.update({
    where: { id: loan.id },
    data: {
      ...(input.principal !== undefined && { principal: new Prisma.Decimal(input.principal) }),
      ...(input.interestRate !== undefined && { interestRate: new Prisma.Decimal(input.interestRate) }),
      ...(input.type && { type: input.type }),
      ...(input.installments !== undefined && { installments: input.installments }),
      ...(input.dueDate && { dueDate: new Date(input.dueDate) }),
    },
  });
}

export async function deleteLoan(userId: string, id: string) {
  const loan = await getLoanOrThrow(userId, id);
  await prisma.loan.delete({ where: { id: loan.id } });
}

export async function addRepayment(userId: string, loanId: string, amount: number, note?: string) {
  const loan = await getLoanOrThrow(userId, loanId);
  const repayment = await prisma.repayment.create({
    data: { loanId: loan.id, amount: new Prisma.Decimal(amount), note },
  });

  const { paid, remaining } = await computeBalance(loan.id);
  const status = remaining <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "ACTIVE";
  await prisma.loan.update({ where: { id: loan.id }, data: { status } });

  return repayment;
}

export async function getBalance(userId: string, loanId: string) {
  const loan = await getLoanOrThrow(userId, loanId);
  return computeBalance(loan.id);
}

async function computeBalance(loanId: string) {
  const loan = await prisma.loan.findUniqueOrThrow({
    where: { id: loanId },
    include: { repayments: true },
  });
  const principal = loan.principal;
  const interestRate = loan.interestRate;
  const interest = principal.mul(interestRate).div(100);
  const totalDue = principal.add(interest);
  const paid = loan.repayments.reduce(
    (sum, r) => sum.add(r.amount),
    new Prisma.Decimal(0)
  );
  const remaining = totalDue.sub(paid);
  return {
    totalDue: totalDue.toNumber(),
    paid: paid.toNumber(),
    remaining: remaining.greaterThan(0) ? remaining.toNumber() : 0,
  };
}

async function getLoanOrThrow(userId: string, id: string) {
  const loan = await prisma.loan.findFirst({
    where: { id, borrower: { userId } },
  });
  if (!loan) throw ApiError.notFound("Loan not found");
  return loan;
}

export async function generateLoanSummaryPdf(loanId: string, res: Response) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      borrower: {
        include: {
          user: true
        }
      },
      repayments: {
        orderBy: { paidAt: 'desc' }
      },
      reminders: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!loan) {
    throw ApiError.notFound("Loan not found");
  }

  const { totalDue, paid, remaining } = await computeBalance(loanId);

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=loan_summary_${loanId.substring(0, 8)}.pdf`);

  doc.pipe(res);

  // Title & Header Section
  doc.fontSize(22).fillColor('#1E3A8A').text('Loan Summary Statement', { align: 'center' });
  doc.moveDown(1.5);

  // Split view: Lender details on left, Borrower on right
  const yStart = doc.y;
  doc.fontSize(12).fillColor('#4B5563').text('LENDER DETAILS', 50, yStart);
  doc.fontSize(10).fillColor('#111827')
     .text(`Name: ${loan.borrower.user.name}`, 50, yStart + 20)
     .text(`Email: ${loan.borrower.user.email}`, 50, yStart + 35);

  doc.fontSize(12).fillColor('#4B5563').text('BORROWER DETAILS', 320, yStart);
  doc.fontSize(10).fillColor('#111827')
     .text(`Name: ${loan.borrower.name}`, 320, yStart + 20)
     .text(`Phone: ${loan.borrower.phone || 'N/A'}`, 320, yStart + 35)
     .text(`Email: ${loan.borrower.email || 'N/A'}`, 320, yStart + 50);

  doc.moveDown(5);

  // Divider Line
  doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1.5);

  // Loan Information Card
  doc.fontSize(14).fillColor('#1E3A8A').text('Loan Information', { underline: true });
  doc.moveDown(0.5);

  const formatVal = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const row = (label: string, value: string) => {
    const cy = doc.y;
    doc.fontSize(10).fillColor('#6B7280').text(label, 50, cy);
    doc.fontSize(10).fillColor('#111827').text(value, 320, cy);
    doc.moveDown(0.8);
  };

  row('Loan ID', loan.id);
  row('Loan Principal Amount', formatVal(loan.principal.toNumber()));
  row('Interest Rate', `${loan.interestRate.toNumber()}%`);
  row('Total Debt (with Interest)', formatVal(totalDue));
  row('Outstanding Balance Due', formatVal(remaining));
  row('Total Paid to Date', formatVal(paid));
  row('Loan Status', loan.status);
  
  if (loan.dueDate) {
    row('Due Date', new Date(loan.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
  }
  
  const lastReminder = loan.reminders[0];
  if (lastReminder) {
    row('Last Reminder Sent', new Date(lastReminder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
  } else {
    row('Reminder Statement Date', new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
  }

  doc.moveDown(1.5);
  doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1.5);

  // Transaction History Section
  doc.fontSize(14).fillColor('#1E3A8A').text('Transaction Repayment History');
  doc.moveDown(0.8);

  if (loan.repayments.length === 0) {
    doc.fontSize(10).fillColor('#9CA3AF').font('Helvetica-Oblique').text('No repayments recorded yet for this loan.');
    doc.font('Helvetica');
  } else {
    // Repayments table header
    const thY = doc.y;
    doc.fontSize(9).fillColor('#4B5563')
       .text('Date', 50, thY)
       .text('Transaction ID', 180, thY)
       .text('Note', 320, thY)
       .text('Amount Paid', 450, thY, { align: 'right', width: 100 });
       
    doc.moveDown(0.5);
    doc.strokeColor('#F3F4F6').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    loan.repayments.forEach((rep) => {
      const cy = doc.y;
      
      if (cy > 720) {
        doc.addPage();
      }
      
      doc.fontSize(9).fillColor('#111827')
         .text(new Date(rep.paidAt).toLocaleDateString('en-IN'), 50, doc.y)
         .text(rep.id.substring(0, 18) + '...', 180, cy)
         .text(rep.note || 'N/A', 320, cy)
         .text(formatVal(rep.amount.toNumber()), 450, cy, { align: 'right', width: 100 });
         
      doc.moveDown(0.8);
    });
  }

  // Footer note
  doc.moveDown(3);
  doc.fontSize(9).fillColor('#9CA3AF').font('Helvetica-Oblique').text('Generated securely by PayBack Pro Statement Engine. For support, please contact your lender directly.', { align: 'center' });

  doc.end();
}
