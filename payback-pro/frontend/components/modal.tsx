"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-white dark:bg-ink-light rounded-card shadow-card border border-line dark:border-ink-light max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line dark:border-ink-light sticky top-0 bg-white dark:bg-ink-light">
          <h2 className="font-display font-semibold text-lg">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-paper-muted dark:hover:bg-ink transition">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
