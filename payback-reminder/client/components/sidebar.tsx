"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HandCoins, LayoutDashboard, Users, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cx } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/borrowers", label: "Borrowers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-line dark:border-ink-light h-screen sticky top-0 px-4 py-6">
      <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold px-2 mb-8">
        <HandCoins size={20} />
        PayBack
      </Link>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                active
                  ? "bg-ink text-paper dark:bg-paper dark:text-ink"
                  : "text-ink-muted hover:bg-paper-muted dark:hover:bg-ink-light"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line dark:border-ink-light pt-4 mt-4">
        <p className="px-2 text-sm font-medium truncate">{user?.name}</p>
        <p className="px-2 text-xs text-ink-muted truncate">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-muted hover:bg-paper-muted dark:hover:bg-ink-light transition"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
