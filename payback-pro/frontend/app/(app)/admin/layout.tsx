"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAdmin()) {
      router.replace("/dashboard");
    } else {
      setAuthorized(true);
    }
    setChecking(false);
  }, [router, pathname]);

  if (checking) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  
  if (!authorized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-paper text-ink">
        <ShieldAlert size={48} className="text-rust mb-4" />
        <h1 className="text-2xl font-bold font-display">403 Forbidden</h1>
        <p className="text-ink-muted mt-2">You do not have permission to access this area.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-ink-dark">
      {/* Secondary Admin Navbar could go here if needed, but for now we just render children */}
      {children}
    </div>
  );
}
