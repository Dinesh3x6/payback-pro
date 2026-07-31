import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import borrowerRoutes from "../modules/borrower/borrower.routes";
import loanRoutes from "../modules/loan/loan.routes";
import reminderRoutes from "../modules/reminder/reminder.routes";
import adminRoutes from "../modules/admin/admin.routes";
import paymentRoutes from "../modules/payment/payment.routes";
import { getLoanSummaryPdfHandler } from "../modules/loan/loan.controller";
import QRCode from "qrcode";
import { prisma } from "../prisma/client";
import { Prisma } from "@prisma/client";

const router = Router();

router.use("/auth", authRoutes);
router.use("/borrowers", borrowerRoutes);

// Public route for downloading PDF statements from emails (no session token required)
router.get("/loans/:id/summary", getLoanSummaryPdfHandler);

// Public route for generating dynamic UPI QR codes in emails (no session token required)
router.get("/loans/:id/qr", async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { repayments: true, borrower: true }
    });

    if (!loan) {
      return res.status(404).send("Loan not found");
    }

    const principal = loan.principal;
    const interestRate = loan.interestRate;
    const interest = principal.mul(interestRate).div(100);
    const paid = loan.repayments.reduce(
      (s, r) => s.add(r.amount),
      new Prisma.Decimal(0)
    );
    const totalDue = principal.add(interest).sub(paid);
    const amountDue = totalDue.greaterThan(0) ? totalDue.toNumber() : 0;

    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || "PayBackPro";
    if (!upiId || amountDue <= 0) {
      return res.status(400).send("UPI ID not configured or no outstanding amount");
    }

    const ref = `RP_${loan.id.replace(/-/g, "").substring(0, 12)}`;
    const note = `Loan Payment - Borrower: ${loan.borrower.name.substring(0, 20)} - Loan: ${loan.id.substring(0, 8)}`;
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amountDue.toFixed(2)}&tn=${encodeURIComponent(note)}&tr=${encodeURIComponent(ref)}&cu=INR`;

    const qrBuffer = await QRCode.toBuffer(upiLink, { type: "png", width: 180, margin: 1 });
    res.setHeader("Content-Type", "image/png");
    res.send(qrBuffer);
  } catch (err: any) {
    res.status(500).send("Internal server error generating QR code");
  }
});

router.use("/loans", loanRoutes);
router.use("/reminders", reminderRoutes);
router.use("/admin", adminRoutes);
router.use("/payments", paymentRoutes);

router.get("/health", (_req, res) => res.json({ success: true, message: "PayBack Pro API is running" }));

export default router;
