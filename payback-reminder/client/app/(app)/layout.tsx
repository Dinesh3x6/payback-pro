"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-muted text-sm">
        Loading your ledger…
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
