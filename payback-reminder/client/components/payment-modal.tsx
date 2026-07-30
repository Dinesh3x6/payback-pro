"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Modal } from "@/components/modal";
import { Borrower, PaymentMethod } from "@/types";
import { recordPayment } from "@/hooks/use-borrowers";
import { formatCurrency } from "@/lib/utils";

interface FormValues {
  amount: number;
  method: PaymentMethod;
  note: string;
}

export function PaymentModal({
  open,
  onClose,
  onSaved,
  borrower,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  borrower: Borrower | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { method: "UPI" } });

  if (!borrower) return null;

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await recordPayment(borrower!.id, {
        amount: Number(values.amount),
        method: values.method,
        note: values.note,
      });
      toast.success("Payment recorded");
      reset();
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Could not record payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Record payment — ${borrower.name}`}>
      <p className="text-sm text-ink-muted mb-4">
        Remaining balance: <span className="font-medium text-ink dark:text-paper tabular">{formatCurrency(borrower.remainingAmount)}</span>
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label-text">Amount received (₹)</label>
          <input
            type="number"
            step="0.01"
            className="input-field"
            {...register("amount", {
              required: "Amount is required",
              min: { value: 0.01, message: "Must be positive" },
              max: { value: borrower.remainingAmount, message: "Cannot exceed remaining balance" },
              valueAsNumber: true,
            })}
          />
          {errors.amount && <p className="text-xs text-rust mt-1">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="label-text">Payment method</label>
          <select className="input-field" {...register("method")}>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="label-text">Note (optional)</label>
          <input className="input-field" {...register("note")} />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Recording…" : "Record payment"}
        </button>
      </form>
    </Modal>
  );
}
