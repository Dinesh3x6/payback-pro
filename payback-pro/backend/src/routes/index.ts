import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import borrowerRoutes from "../modules/borrower/borrower.routes";
import loanRoutes from "../modules/loan/loan.routes";
import reminderRoutes from "../modules/reminder/reminder.routes";
import adminRoutes from "../modules/admin/admin.routes";
import paymentRoutes from "../modules/payment/payment.routes";
import { getLoanSummaryPdfHandler } from "../modules/loan/loan.controller";

const router = Router();

router.use("/auth", authRoutes);
router.use("/borrowers", borrowerRoutes);

// Public route for downloading PDF statements from emails (no session token required)
router.get("/loans/:id/summary", getLoanSummaryPdfHandler);

router.use("/loans", loanRoutes);
router.use("/reminders", reminderRoutes);
router.use("/admin", adminRoutes);
router.use("/payments", paymentRoutes);

router.get("/health", (_req, res) => res.json({ success: true, message: "PayBack Pro API is running" }));

export default router;
