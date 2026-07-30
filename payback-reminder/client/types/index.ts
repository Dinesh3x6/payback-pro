export type BorrowerStatus = "PENDING" | "PARTIALLY_PAID" | "PAID";
export type ReminderFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "NONE";
export type PaymentMethod = "UPI" | "CASH" | "BANK_TRANSFER" | "OTHER";

export interface Payment {
  id: string;
  borrowerId: string;
  amount: number;
  method: PaymentMethod;
  note?: string | null;
  paidAt: string;
}

export interface Borrower {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  amount: number;
  remainingAmount: number;
  borrowDate: string;
  dueDate: string;
  notes?: string | null;
  status: BorrowerStatus;
  reminderFrequency: ReminderFrequency;
  remindersActive: boolean;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalLent: number;
  totalPending: number;
  totalRecovered: number;
  overdueCount: number;
  overdueAmount: number;
  borrowerCount: number;
  statusBreakdown: { pending: number; partiallyPaid: number; paid: number };
}

export interface User {
  id: string;
  name: string;
  email: string;
  upiId?: string | null;
  theme: string;
}

export interface PaginatedBorrowers {
  items: Borrower[];
  total: number;
  page: number;
  pageSize: number;
}
