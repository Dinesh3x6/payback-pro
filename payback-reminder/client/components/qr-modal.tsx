"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/modal";
import { Borrower } from "@/types";
import { fetchBorrowerQr } from "@/hooks/use-borrowers";
import { formatCurrency } from "@/lib/utils";

export function QrModal({ open, onClose, borrower }: { open: boolean; onClose: () => void; borrower: Borrower | null }) {
  const [qr, setQr] = useState<{ qrCodeDataUrl: string; upiLink: string; amount: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && borrower) {
      setLoading(true);
      setQr(null);
      fetchBorrowerQr(borrower.id)
        .then(setQr)
        .catch((err) => toast.error(err?.response?.data?.error ?? "Could not generate QR code"))
        .finally(() => setLoading(false));
    }
  }, [open, borrower]);

  if (!borrower) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Collect payment — ${borrower.name}`}>
      <div className="text-center">
        {loading && <p className="text-sm text-ink-muted py-10">Generating QR code…</p>}
        {qr && (
          <>
            <p className="text-sm text-ink-muted mb-3">
              Amount due: <span className="font-medium text-ink dark:text-paper tabular">{formatCurrency(qr.amount)}</span>
            </p>
            <div className="inline-block p-4 bg-white rounded-card border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.qrCodeDataUrl} alt="UPI QR code" width={220} height={220} />
            </div>
            <p className="text-xs text-ink-muted mt-4">
              Share this QR with {borrower.name}, or send the{" "}
              <a href={qr.upiLink} className="underline">
                UPI link
              </a>{" "}
              directly.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
