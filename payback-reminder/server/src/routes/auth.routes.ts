import { Router } from "express";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth } from "@/middleware/auth.middleware";
import { loginSchema, signupSchema } from "@/utils/schemas";
import {
  loginHandler,
  meHandler,
  signupHandler,
  updateProfileHandler,
} from "@/controllers/auth.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.post("/signup", validate(signupSchema), asyncHandler(signupHandler));
router.post("/login", validate(loginSchema), asyncHandler(loginHandler));
router.get("/me", requireAuth, asyncHandler(meHandler));
router.patch("/me", requireAuth, asyncHandler(updateProfileHandler));

export default router;
