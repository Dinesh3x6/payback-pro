"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, QrCode, Wallet, Pencil, Mail, Phone, BellOff, Bell } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { StatusBadge } from "@/components/status-badge";
import { PaymentHistory } from "@/components/payment-history";
import { PaymentModal } from "@/components/payment-modal";
import { QrModal } from "@/components/qr-modal";
import { BorrowerFormModal } from "@/components/borrower-form-modal";
import { useBorrower } from "@/hooks/use-borrower";
import { updateBorrower } from "@/hooks/use-borrowers";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils";

export default function BorrowerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { borrower, loading, reload } = useBorrower(id);

  const [paying, setPaying] = useState(false);
  const [showingQr, setShowingQr] = useState(false);
  const [editing, setEditing] = useState(false);

  if (loading) {
    return (
      <div>
        <Navbar title="Borrower" />
        <main className="px-5 py-6 max-w-4xl mx-auto text-sm text-ink-muted">Loading…</main>
      </div>
    );
  }

  if (!borrower) {
    return (
      <div>
        <Navbar title="Borrower" />
        <main className="px-5 py-6 max-w-4xl mx-auto text-sm text-ink-muted">Borrower not found.</main>
      </div>
    );
  }

  const overdue = isOverdue(borrower.dueDate, borrower.status);

  async function toggleReminders() {
    try {
      await updateBorrower(borrower!.id, { remindersActive: !borrower!.remindersActive } as any);
      toast.success(borrower!.remindersActive ? "Reminders paused" : "Reminders resumed");
      reload();
    } catch {
      toast.error("Could not update reminders");
    }
  }

  return (
    <div>
      <Navbar title={borrower.name} />
      <main className="px-5 py-6 max-w-4xl mx-auto">
        <button onClick={() => router.push("/borrowers")} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink dark:hover:text-paper mb-4">
          <ArrowLeft size={15} /> Back to borrowers
        </button>

        <div className="stub-card p-6 pt-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-display font-semibold">{borrower.name}</h2>
                <StatusBadge status={borrower.status} overdue={overdue} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                {borrower.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} /> {borrower.email}
                  </span>
                )}
                {borrower.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} /> {borrower.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="btn-secondary">
                <Pencil size={15} /> Edit
              </button>
              {borrower.status !== "PAID" && (
                <>
                  <button onClick={() => setShowingQr(true)} className="btn-secondary">
                    <QrCode size={15} /> QR
                  </button>
                  <button onClick={() => setPaying(true)} className="btn-primary">
                    <Wallet size={15} /> Record payment
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-line dark:border-ink-light pt-5">
            <div>
              <p className="label-text">Original amount</p>
              <p className="tabular font-medium">{formatCurrency(borrower.amount)}</p>
            </div>
            <div>
              <p className="label-text">Remaining</p>
              <p className="tabular font-medium">{formatCurrency(borrower.remainingAmount)}</p>
            </div>
            <div>
              <p className="label-text">Borrowed on</p>
              <p>{formatDate(borrower.borrowDate)}</p>
            </div>
            <div>
              <p className="label-text">Due on</p>
              <p className={overdue ? "text-rust font-medium" : ""}>{formatDate(borrower.dueDate)}</p>
            </div>
          </div>

          {borrower.notes && (
            <div className="mt-5 border-t border-line dark:border-ink-light pt-4">
              <p className="label-text">Notes</p>
              <p className="text-sm text-ink-muted">{borrower.notes}</p>
            </div>
          )}

          <div className="mt-5 border-t border-line dark:border-ink-light pt-4 flex items-center justify-between">
            <div>
              <p className="label-text mb-0.5">Reminders</p>
              <p className="text-sm text-ink-muted">
                {borrower.status === "PAID"
                  ? "Stopped automatically — this debt is paid."
                  : `${borrower.reminderFrequency.charAt(0)}${borrower.reminderFrequency.slice(1).toLowerCase()} via email, ${
                      borrower.remindersActive ? "active" : "paused"
                    }.`}
              </p>
            </div>
            {borrower.status !== "PAID" && (
              <button onClick={toggleReminders} className="btn-secondary">
                {borrower.remindersActive ? <BellOff size={15} /> : <Bell size={15} />}
                {borrower.remindersActive ? "Pause" : "Resume"}
              </button>
            )}
          </div>
        </div>

        <div className="stub-card p-6 pt-7 mt-5">
          <span className="label-text">Payment history</span>
          <div className="mt-3">
            <PaymentHistory payments={borrower.payments ?? []} />
          </div>
        </div>
      </main>

      <PaymentModal open={paying} onClose={() => setPaying(false)} onSaved={reload} borrower={borrower} />
      <QrModal open={showingQr} onClose={() => setShowingQr(false)} borrower={borrower} />
      <BorrowerFormModal open={editing} onClose={() => setEditing(false)} onSaved={reload} borrower={borrower} />
    </div>
  );
}
