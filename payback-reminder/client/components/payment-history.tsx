import { Payment } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const METHOD_LABELS: Record<string, string> = {
  UPI: "UPI",
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

export function PaymentHistory({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <p className="text-sm text-ink-muted">No payments recorded yet.</p>;
  }

  return (
    <ul className="space-y-0">
      {payments.map((p, i) => (
        <li
          key={p.id}
          className="flex items-center justify-between py-3 border-b border-dashed border-line dark:border-ink-light last:border-0"
        >
          <div>
            <p className="text-sm font-medium tabular">{formatCurrency(p.amount)}</p>
            <p className="text-xs text-ink-muted mt-0.5">
              {METHOD_LABELS[p.method] ?? p.method} · {formatDate(p.paidAt)}
              {p.note ? ` · ${p.note}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
