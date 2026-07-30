import { Response } from "express";
import { AuthedRequest } from "@/middleware/auth.middleware";
import * as borrowerService from "@/services/borrower.service";
import * as exportService from "@/services/export.service";

export async function getDashboardHandler(req: AuthedRequest, res: Response) {
  const stats = await borrowerService.getDashboardStats(req.userId!);
  res.json(stats);
}

export async function exportCsvHandler(req: AuthedRequest, res: Response) {
  const csv = await exportService.exportBorrowersCsv(req.userId!);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="borrowers-${Date.now()}.csv"`);
  res.send(csv);
}

export async function exportPdfHandler(req: AuthedRequest, res: Response) {
  const pdf = await exportService.exportBorrowersPdf(req.userId!);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="borrowers-${Date.now()}.pdf"`);
  res.send(pdf);
}
