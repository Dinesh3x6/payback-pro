import { BorrowerStatus } from "@/types";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function isOverdue(dueDate: string, status: BorrowerStatus): boolean {
  return status !== "PAID" && new Date(dueDate) < new Date();
}

export const STATUS_STYLES: Record<BorrowerStatus, string> = {
  PENDING: "bg-amber-light text-amber",
  PARTIALLY_PAID: "bg-amber-light text-amber",
  PAID: "bg-moss-light text-moss",
};

export const STATUS_LABELS: Record<BorrowerStatus, string> = {
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
};

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
