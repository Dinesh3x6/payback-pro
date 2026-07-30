"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Navbar } from "@/components/navbar";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { BorrowerTable } from "@/components/borrower-table";
import { BorrowerFormModal } from "@/components/borrower-form-modal";
import { PaymentModal } from "@/components/payment-modal";
import { QrModal } from "@/components/qr-modal";
import { useBorrowers, deleteBorrower } from "@/hooks/use-borrowers";
import { Borrower, BorrowerStatus } from "@/types";
import { api } from "@/lib/api";

export default function BorrowersPage() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BorrowerStatus | "">((searchParams.get("status") as BorrowerStatus) || "");
  const [overdue, setOverdue] = useState(searchParams.get("overdue") === "1");

  const { data, loading, reload } = useBorrowers({ search, status, overdue });

  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "1");
  const [editing, setEditing] = useState<Borrower | null>(null);
  const [paying, setPaying] = useState<Borrower | null>(null);
  const [showingQr, setShowingQr] = useState<Borrower | null>(null);

  async function handleDelete(b: Borrower) {
    if (!confirm(`Delete ${b.name}? This removes their full payment history.`)) return;
    try {
      await deleteBorrower(b.id);
      toast.success("Borrower deleted");
      reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Could not delete borrower");
    }
  }

  async function handleExport(format: "csv" | "pdf") {
    try {
      const res = await api.get(`/dashboard/export/${format}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `borrowers.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`Could not export ${format.toUpperCase()}`);
    }
  }

  return (
    <div>
      <Navbar title="Borrowers" />
      <main className="px-5 py-6 max-w-6xl mx-auto">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          overdue={overdue}
          onOverdueChange={setOverdue}
          onAdd={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          onExportCsv={() => handleExport("csv")}
          onExportPdf={() => handleExport("pdf")}
        />

        {loading ? (
          <p className="text-sm text-ink-muted">Loading borrowers…</p>
        ) : (
          <BorrowerTable
            borrowers={data?.items ?? []}
            onEdit={(b) => {
              setEditing(b);
              setFormOpen(true);
            }}
            onDelete={handleDelete}
            onRecordPayment={setPaying}
            onShowQr={setShowingQr}
          />
        )}
      </main>

      <BorrowerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        borrower={editing}
      />
      <PaymentModal open={Boolean(paying)} onClose={() => setPaying(null)} onSaved={reload} borrower={paying} />
      <QrModal open={Boolean(showingQr)} onClose={() => setShowingQr(null)} borrower={showingQr} />
    </div>
  );
}
