import { Router } from "express";
import { requireAuth } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  createBorrowerSchema,
  createPaymentSchema,
  listBorrowersQuerySchema,
  updateBorrowerSchema,
} from "@/utils/schemas";
import {
  createBorrowerHandler,
  deleteBorrowerHandler,
  getBorrowerHandler,
  getBorrowerQrHandler,
  listBorrowersHandler,
  recordPaymentHandler,
  updateBorrowerHandler,
} from "@/controllers/borrower.controller";

const router = Router();
router.use(requireAuth);

router.get("/", validate(listBorrowersQuerySchema, "query"), asyncHandler(listBorrowersHandler));
router.post("/", validate(createBorrowerSchema), asyncHandler(createBorrowerHandler));
router.get("/:id", asyncHandler(getBorrowerHandler));
router.patch("/:id", validate(updateBorrowerSchema), asyncHandler(updateBorrowerHandler));
router.delete("/:id", asyncHandler(deleteBorrowerHandler));

router.post("/:id/payments", validate(createPaymentSchema), asyncHandler(recordPaymentHandler));
router.get("/:id/qr", asyncHandler(getBorrowerQrHandler));

export default router;
