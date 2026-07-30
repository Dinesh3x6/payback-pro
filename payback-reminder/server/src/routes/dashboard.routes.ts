import { Router } from "express";
import { requireAuth } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  exportCsvHandler,
  exportPdfHandler,
  getDashboardHandler,
} from "@/controllers/dashboard.controller";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(getDashboardHandler));
router.get("/export/csv", asyncHandler(exportCsvHandler));
router.get("/export/pdf", asyncHandler(exportPdfHandler));

export default router;
