import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "./auth.validation";
import {
  registerHandler,
  loginHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
  getProfileHandler,
  updateProfileHandler,
} from "./auth.controller";

const router = Router();

router.post("/register", validateBody(registerSchema), registerHandler);
router.post("/login", validateBody(loginSchema), loginHandler);
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPasswordHandler);
router.post("/reset-password", validateBody(resetPasswordSchema), resetPasswordHandler);

router.get("/profile", requireAuth, getProfileHandler);
router.put("/profile", requireAuth, validateBody(updateProfileSchema), updateProfileHandler);
router.post("/change-password", requireAuth, validateBody(changePasswordSchema), changePasswordHandler);

export default router;
