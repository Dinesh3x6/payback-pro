"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cx } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/borrowers", label: "Borrowers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navbar({ title }: { title: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 bg-paper/90 dark:bg-ink/90 backdrop-blur border-b border-line dark:border-ink-light">
      <div className="flex items-center justify-between px-5 py-4">
        <h1 className="text-lg font-display font-semibold">{title}</h1>
        <ThemeToggle />
      </div>
      <nav className="md:hidden flex items-center gap-1 px-3 pb-3 overflow-x-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                active ? "bg-ink text-paper dark:bg-paper dark:text-ink" : "text-ink-muted"
              )}
            >
              <Icon size={14} /> {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
