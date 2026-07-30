import { Response } from "express";
import { AuthedRequest } from "@/middleware/auth.middleware";
import * as borrowerService from "@/services/borrower.service";
import { generateUpiQrDataUrl, buildUpiPaymentString } from "@/services/qrcode.service";
import { prisma } from "@/config/prisma";
import { AppError } from "@/middleware/error.middleware";

export async function listBorrowersHandler(req: AuthedRequest, res: Response) {
  const q = req.query as any;
  const result = await borrowerService.listBorrowers({
    userId: req.userId!,
    search: q.search,
    status: q.status,
    overdue: q.overdue,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    page: q.page,
    pageSize: q.pageSize,
  });
  res.json(result);
}

export async function getBorrowerHandler(req: AuthedRequest, res: Response) {
  const borrower = await borrowerService.getBorrowerOrThrow(req.userId!, req.params.id);
  res.json({ borrower });
}

export async function createBorrowerHandler(req: AuthedRequest, res: Response) {
  const borrower = await borrowerService.createBorrower(req.userId!, req.body);
  res.status(201).json({ borrower });
}

export async function updateBorrowerHandler(req: AuthedRequest, res: Response) {
  const borrower = await borrowerService.updateBorrower(req.userId!, req.params.id, req.body);
  res.json({ borrower });
}

export async function deleteBorrowerHandler(req: AuthedRequest, res: Response) {
  await borrowerService.deleteBorrower(req.userId!, req.params.id);
  res.status(204).send();
}

export async function recordPaymentHandler(req: AuthedRequest, res: Response) {
  const result = await borrowerService.recordPayment(req.userId!, req.params.id, req.body);
  res.status(201).json(result);
}

export async function getBorrowerQrHandler(req: AuthedRequest, res: Response) {
  const borrower = await borrowerService.getBorrowerOrThrow(req.userId!, req.params.id);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });

  if (!user.upiId) {
    throw new AppError("Add your UPI ID in profile settings before generating a QR code", 400);
  }

  const amount = Number(borrower.remainingAmount);
  const options = {
    payeeUpiId: user.upiId,
    payeeName: user.name,
    amount,
    note: `Repayment from ${borrower.name}`,
  };

  const dataUrl = await generateUpiQrDataUrl(options);
  const upiLink = buildUpiPaymentString(options);
  res.json({ qrCodeDataUrl: dataUrl, upiLink, amount });
}
