import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth.middleware";
import * as borrowerService from "./borrower.service";

export const listHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const borrowers = await borrowerService.listBorrowers(req.user!.userId, search);
  res.json({ success: true, data: borrowers });
});

export const getHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const borrower = await borrowerService.getBorrower(req.user!.userId, req.params.id);
  res.json({ success: true, data: borrower });
});

export const createHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const borrower = await borrowerService.createBorrower(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: borrower });
});

export const updateHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const borrower = await borrowerService.updateBorrower(req.user!.userId, req.params.id, req.body);
  res.json({ success: true, data: borrower });
});

import { logger } from "../../config/logger";

export const deleteHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mode = req.query.mode === "archive" ? "archive" : "permanent";
  const { id } = req.params;
  const adminUser = req.user?.email || req.user?.userId || "unknown";

  try {
    const result = await borrowerService.deleteBorrower(req.user!.userId, id, mode);
    
    logger.info("Borrower delete operation succeeded", {
      borrowerId: id,
      deleteTime: new Date().toISOString(),
      adminUser,
      mode,
      action: result.action
    });

    res.json(result);
  } catch (err: any) {
    logger.error("Borrower delete operation failed", {
      borrowerId: id,
      deleteTime: new Date().toISOString(),
      adminUser,
      mode,
      error: err.message,
      stack: err.stack
    });
    
    throw err;
  }
});
