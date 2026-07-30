import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { createHandler, updateHandler, deleteHandler, addRepaymentHandler, getBalanceHandler } from "./loan.controller";

const router = Router();
router.use(requireAuth);

router.post("/", createHandler);
router.put("/:id", updateHandler);
router.delete("/:id", deleteHandler);
router.post("/:id/repayments", addRepaymentHandler);
router.get("/:id/balance", getBalanceHandler);

export default router;
