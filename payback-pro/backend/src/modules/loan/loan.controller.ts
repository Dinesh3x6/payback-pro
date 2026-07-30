import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth.middleware";
import * as loanService from "./loan.service";

export const createHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const loan = await loanService.createLoan(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: loan });
});

export const updateHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const loan = await loanService.updateLoan(req.user!.userId, req.params.id, req.body);
  res.json({ success: true, data: loan });
});

export const deleteHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  await loanService.deleteLoan(req.user!.userId, req.params.id);
  res.json({ success: true, message: "Loan deleted" });
});

export const addRepaymentHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, note } = req.body;
  const repayment = await loanService.addRepayment(req.user!.userId, req.params.id, amount, note);
  res.status(201).json({ success: true, data: repayment });
});

export const getBalanceHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const balance = await loanService.getBalance(req.user!.userId, req.params.id);
  res.json({ success: true, data: balance });
});

export const getLoanSummaryPdfHandler = asyncHandler(async (req: any, res: Response) => {
  await loanService.generateLoanSummaryPdf(req.params.id, res);
});
