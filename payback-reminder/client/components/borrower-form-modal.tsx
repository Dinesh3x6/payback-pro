"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Modal } from "@/components/modal";
import { Borrower, ReminderFrequency } from "@/types";
import { createBorrower, updateBorrower } from "@/hooks/use-borrowers";

interface FormValues {
  name: string;
  email: string;
  phone: string;
  amount: number;
  borrowDate: string;
  dueDate: string;
  notes: string;
  reminderFrequency: ReminderFrequency;
}

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : "";
}

export function BorrowerFormModal({
  open,
  onClose,
  onSaved,
  borrower,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  borrower?: Borrower | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(borrower);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        name: borrower?.name ?? "",
        email: borrower?.email ?? "",
        phone: borrower?.phone ?? "",
        amount: borrower?.amount ?? undefined,
        borrowDate: toDateInput(borrower?.borrowDate) || new Date().toISOString().slice(0, 10),
        dueDate: toDateInput(borrower?.dueDate),
        notes: borrower?.notes ?? "",
        reminderFrequency: borrower?.reminderFrequency ?? "WEEKLY",
      });
    }
  }, [open, borrower, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      if (isEdit && borrower) {
        await updateBorrower(borrower.id, {
          name: values.name,
          email: values.email || undefined,
          phone: values.phone || undefined,
          dueDate: values.dueDate as any,
          notes: values.notes,
          reminderFrequency: values.reminderFrequency,
        });
        toast.success("Borrower updated");
      } else {
        await createBorrower({
          name: values.name,
          email: values.email || undefined,
          phone: values.phone || undefined,
          amount: Number(values.amount),
          borrowDate: values.borrowDate as any,
          dueDate: values.dueDate as any,
          notes: values.notes,
          reminderFrequency: values.reminderFrequency,
        });
        toast.success("Borrower added");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit borrower" : "Add a borrower"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label-text">Full name</label>
          <input className="input-field" {...register("name", { required: "Name is required" })} />
          {errors.name && <p className="text-xs text-rust mt-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Email</label>
            <input type="email" className="input-field" {...register("email")} />
          </div>
          <div>
            <label className="label-text">Phone</label>
            <input className="input-field" {...register("phone")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Amount lent (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input-field disabled:opacity-60"
              disabled={isEdit}
              {...register("amount", {
                required: !isEdit && "Amount is required",
                min: { value: 1, message: "Must be positive" },
                valueAsNumber: true,
              })}
            />
            {errors.amount && <p className="text-xs text-rust mt-1">{errors.amount.message}</p>}
            {isEdit && <p className="text-xs text-ink-muted mt-1">Record a payment to change the balance</p>}
          </div>
          <div>
            <label className="label-text">Reminder frequency</label>
            <select className="input-field" {...register("reminderFrequency")}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="NONE">None</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Borrow date</label>
            <input
              type="date"
              className="input-field disabled:opacity-60"
              disabled={isEdit}
              {...register("borrowDate", { required: !isEdit && "Required" })}
            />
          </div>
          <div>
            <label className="label-text">Due date</label>
            <input type="date" className="input-field" {...register("dueDate", { required: "Required" })} />
            {errors.dueDate && <p className="text-xs text-rust mt-1">{errors.dueDate.message}</p>}
          </div>
        </div>

        <div>
          <label className="label-text">Notes</label>
          <textarea rows={2} className="input-field" {...register("notes")} />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add borrower"}
        </button>
      </form>
    </Modal>
  );
}
