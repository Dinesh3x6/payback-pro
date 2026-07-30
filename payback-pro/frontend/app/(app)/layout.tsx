"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getToken } from "@/lib/auth";

import { AIAssistant } from "@/components/ai-assistant";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-muted text-sm">
        Loading your ledger…
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        {children}
        <AIAssistant />
      </div>
    </div>
  );
}
