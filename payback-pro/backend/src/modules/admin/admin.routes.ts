import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { isAdmin } from "../../middleware/admin.middleware";
import * as adminController from "./admin.controller";

const router = Router();

router.use(requireAuth);
router.use(isAdmin);

router.get("/dashboard", adminController.getDashboardStatsHandler);
router.get("/users", adminController.getUsersHandler);
router.patch("/users/:id/status", adminController.updateUserStatusHandler);
router.post("/users/:id/reset-password", adminController.resetUserPasswordHandler);
router.delete("/users/:id", adminController.deleteUserHandler);

router.get("/sessions", adminController.getSessionsHandler);
router.post("/sessions/:id/terminate", adminController.terminateSessionHandler);

router.get("/analytics", adminController.getAnalyticsHandler);

router.get("/settings", adminController.getGlobalSettingsHandler);
router.put("/settings", adminController.updateGlobalSettingsHandler);

export default router;
