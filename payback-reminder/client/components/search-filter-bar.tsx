"use client";

import { Search, Plus, Download } from "lucide-react";
import { BorrowerStatus } from "@/types";

export function SearchFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  overdue,
  onOverdueChange,
  onAdd,
  onExportCsv,
  onExportPdf,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  status: BorrowerStatus | "";
  onStatusChange: (v: BorrowerStatus | "") => void;
  overdue: boolean;
  onOverdueChange: (v: boolean) => void;
  onAdd: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email, or phone"
          className="input-field pl-9"
        />
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as BorrowerStatus | "")}
        className="input-field sm:w-44"
      >
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="PARTIALLY_PAID">Partially paid</option>
        <option value="PAID">Paid</option>
      </select>

      <button
        onClick={() => onOverdueChange(!overdue)}
        className={overdue ? "btn-primary" : "btn-secondary"}
      >
        Overdue only
      </button>

      <div className="flex gap-2">
        <button onClick={onExportCsv} className="btn-secondary" title="Export CSV">
          <Download size={15} /> CSV
        </button>
        <button onClick={onExportPdf} className="btn-secondary" title="Export PDF">
          <Download size={15} /> PDF
        </button>
        <button onClick={onAdd} className="btn-primary">
          <Plus size={16} /> Add
        </button>
      </div>
    </div>
  );
}
