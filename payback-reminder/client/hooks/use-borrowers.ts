"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Borrower, BorrowerStatus, PaginatedBorrowers } from "@/types";

export interface BorrowerFilters {
  search?: string;
  status?: BorrowerStatus | "";
  overdue?: boolean;
  sortBy?: "dueDate" | "amount" | "createdAt" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
}

export function useBorrowers(filters: BorrowerFilters) {
  const [data, setData] = useState<PaginatedBorrowers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | boolean> = {
        sortBy: filters.sortBy ?? "dueDate",
        sortOrder: filters.sortOrder ?? "asc",
        page: filters.page ?? 1,
        pageSize: 20,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.overdue) params.overdue = true;

      const { data } = await api.get("/borrowers", { params });
      setData(data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to load borrowers");
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status, filters.overdue, filters.sortBy, filters.sortOrder, filters.page]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export async function createBorrower(payload: Partial<Borrower>) {
  const { data } = await api.post("/borrowers", payload);
  return data.borrower as Borrower;
}

export async function updateBorrower(id: string, payload: Partial<Borrower>) {
  const { data } = await api.patch(`/borrowers/${id}`, payload);
  return data.borrower as Borrower;
}

export async function deleteBorrower(id: string) {
  await api.delete(`/borrowers/${id}`);
}

export async function recordPayment(
  id: string,
  payload: { amount: number; method: string; note?: string }
) {
  const { data } = await api.post(`/borrowers/${id}/payments`, payload);
  return data as { payment: any; borrower: Borrower };
}

export async function fetchBorrowerQr(id: string) {
  const { data } = await api.get(`/borrowers/${id}/qr`);
  return data as { qrCodeDataUrl: string; upiLink: string; amount: number };
}
