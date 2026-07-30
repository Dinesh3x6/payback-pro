"use client";

import Link from "next/link";
import { QrCode, Wallet, Pencil, Trash2 } from "lucide-react";
import { Borrower } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils";

export function BorrowerTable({
  borrowers,
  onEdit,
  onDelete,
  onRecordPayment,
  onShowQr,
}: {
  borrowers: Borrower[];
  onEdit: (b: Borrower) => void;
  onDelete: (b: Borrower) => void;
  onRecordPayment: (b: Borrower) => void;
  onShowQr: (b: Borrower) => void;
}) {
  if (borrowers.length === 0) {
    return (
      <div className="stub-card p-10 text-center">
        <p className="text-ink-muted text-sm">No borrowers match these filters yet.</p>
      </div>
    );
  }

  return (
    <div className="stub-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-line dark:border-ink-light">
            <th className="px-5 py-3.5 font-medium">Borrower</th>
            <th className="px-5 py-3.5 font-medium">Amount</th>
            <th className="px-5 py-3.5 font-medium">Remaining</th>
            <th className="px-5 py-3.5 font-medium">Due date</th>
            <th className="px-5 py-3.5 font-medium">Status</th>
            <th className="px-5 py-3.5 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {borrowers.map((b) => {
            const overdue = isOverdue(b.dueDate, b.status);
            return (
              <tr key={b.id} className="border-b border-line/60 dark:border-ink-light/60 last:border-0 hover:bg-paper-muted/60 dark:hover:bg-ink/40 transition">
                <td className="px-5 py-3.5">
                  <Link href={`/borrowers/${b.id}`} className="font-medium hover:underline">
                    {b.name}
                  </Link>
                  <p className="text-xs text-ink-muted mt-0.5">{b.email || b.phone || "—"}</p>
                </td>
                <td className="px-5 py-3.5 tabular">{formatCurrency(b.amount)}</td>
                <td className="px-5 py-3.5 tabular font-medium">{formatCurrency(b.remainingAmount)}</td>
                <td className="px-5 py-3.5">{formatDate(b.dueDate)}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={b.status} overdue={overdue} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {b.status !== "PAID" && (
                      <>
                        <button
                          title="Record payment"
                          onClick={() => onRecordPayment(b)}
                          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-paper-muted dark:hover:bg-ink-light"
                        >
                          <Wallet size={15} />
                        </button>
                        <button
                          title="Show UPI QR"
                          onClick={() => onShowQr(b)}
                          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-paper-muted dark:hover:bg-ink-light"
                        >
                          <QrCode size={15} />
                        </button>
                      </>
                    )}
                    <button
                      title="Edit"
                      onClick={() => onEdit(b)}
                      className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-paper-muted dark:hover:bg-ink-light"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      title="Delete"
                      onClick={() => onDelete(b)}
                      className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-rust-light text-rust"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
