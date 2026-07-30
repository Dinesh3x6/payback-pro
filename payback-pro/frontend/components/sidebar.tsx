"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, HandCoins, LayoutDashboard, Users, Settings, LogOut, ChevronDown, Check } from "lucide-react";
import { getToken, clearToken, isAdmin } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace-context";
import { useState } from "react";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/borrowers", label: "Borrowers", icon: Users },
  { href: "/settings/team", label: "Team & Workspace", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { workspaces, activeWorkspace, setActiveWorkspace, activeRole } = useWorkspace();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [admin] = useState(isAdmin());

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-line dark:border-ink-light h-screen sticky top-0 px-4 py-6">
      <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold px-2 mb-6">
        <HandCoins size={20} />
        PayBack Pro
      </Link>

      {/* Workspace Switcher */}
      <div className="relative mb-6 px-2">
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-paper-muted dark:bg-ink border border-line dark:border-ink-light rounded-lg text-sm text-left hover:border-ink/20 transition"
        >
          <div className="overflow-hidden">
            <p className="font-medium truncate">{activeWorkspace.name}</p>
            <p className="text-[10px] text-ink-muted uppercase">{activeRole}</p>
          </div>
          <ChevronDown size={14} className="text-ink-muted shrink-0" />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-2 right-2 mt-1 bg-paper dark:bg-ink-dark border border-line dark:border-ink-light rounded-lg shadow-xl py-1.5 z-50">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Switch Workspace</div>
            {workspaces.map(ws => (
              <button 
                key={ws.id} 
                onClick={() => { setActiveWorkspace(ws.id); setDropdownOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-paper-muted dark:hover:bg-ink transition text-left"
              >
                <span className="truncate">{ws.name}</span>
                {ws.id === activeWorkspace.id && <Check size={14} className="text-moss" />}
              </button>
            ))}
          </div>
        )}
      </div>

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

      {admin && (
        <div className="mt-4 pt-4 border-t border-line dark:border-ink-light">
          <p className="px-3 text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Admin</p>
          <nav className="space-y-1">
            <Link
              href="/admin"
              className={cx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                pathname?.startsWith("/admin")
                  ? "bg-rust/10 text-rust dark:bg-rust/20"
                  : "text-ink-muted hover:bg-paper-muted dark:hover:bg-ink-light"
              )}
            >
              <Shield size={17} />
              Admin Panel
            </Link>
          </nav>
        </div>
      )}

      <div className="border-t border-line dark:border-ink-light pt-4 mt-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-muted hover:bg-paper-muted dark:hover:bg-ink-light transition"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
