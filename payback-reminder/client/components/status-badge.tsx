import { BorrowerStatus } from "@/types";
import { STATUS_LABELS, STATUS_STYLES, cx } from "@/lib/utils";

export function StatusBadge({ status, overdue }: { status: BorrowerStatus; overdue?: boolean }) {
  if (overdue) {
    return <span className="badge bg-rust-light text-rust">Overdue</span>;
  }
  return <span className={cx("badge", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</span>;
}
