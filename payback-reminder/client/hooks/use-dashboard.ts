"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DashboardStats } from "@/types";

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/dashboard");
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, reload: load };
}
