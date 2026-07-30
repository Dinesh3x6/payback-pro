"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Borrower } from "@/types";

export function useBorrower(id: string) {
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/borrowers/${id}`);
      setBorrower(data.borrower);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not load borrower");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { borrower, loading, error, reload: load };
}
