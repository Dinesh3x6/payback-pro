import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { listHandler, getHandler, createHandler, updateHandler, deleteHandler } from "./borrower.controller";

const router = Router();
router.use(requireAuth);

router.get("/", listHandler);
router.get("/:id", getHandler);
router.post("/", createHandler);
router.put("/:id", updateHandler);
router.delete("/:id", deleteHandler);

export default router;
