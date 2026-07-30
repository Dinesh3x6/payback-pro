import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { createReminderSchema, sendNowSchema } from "./reminder.validation";
import {
  createHandler,
  sendNowHandler,
  listHandler,
  pauseHandler,
  resumeHandler,
  cancelHandler,
  historyHandler,
} from "./reminder.controller";

const router = Router();
router.use(requireAuth);

router.get("/", listHandler);
router.post("/", validateBody(createReminderSchema), createHandler);
router.post("/send-now", validateBody(sendNowSchema), sendNowHandler);
router.post("/:id/pause", pauseHandler);
router.post("/:id/resume", resumeHandler);
router.post("/:id/cancel", cancelHandler);
router.get("/:id/history", historyHandler);

export default router;
