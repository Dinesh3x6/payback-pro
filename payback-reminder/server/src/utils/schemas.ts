import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createBorrowerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  borrowDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  notes: z.string().max(2000).optional(),
  reminderFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "NONE"]).default("WEEKLY"),
});

export const updateBorrowerSchema = createBorrowerSchema.partial().extend({
  status: z.enum(["PENDING", "PARTIALLY_PAID", "PAID"]).optional(),
  remindersActive: z.boolean().optional(),
});

export const createPaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  method: z.enum(["UPI", "CASH", "BANK_TRANSFER", "OTHER"]).default("UPI"),
  note: z.string().max(500).optional(),
  paidAt: z.coerce.date().optional(),
});

export const listBorrowersQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["PENDING", "PARTIALLY_PAID", "PAID"]).optional(),
  overdue: z.coerce.boolean().optional(),
  sortBy: z.enum(["dueDate", "amount", "createdAt", "name"]).default("dueDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
