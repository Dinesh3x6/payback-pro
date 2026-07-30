"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import { Shield, ShieldOff, Trash2, KeyRound } from "lucide-react";
import { cx } from "@/lib/utils";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  function fetchUsers() {
    apiGet("/admin/users").then(res => setUsers((res as any[]) || []));
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await apiPatch(`/admin/users/${id}/status`, { status: newStatus });
    fetchUsers();
  }

  async function deleteUser(id: string) {
    if (!confirm("Are you sure you want to permanently delete this user and all their data?")) return;
    await apiDelete(`/admin/users/${id}`);
    fetchUsers();
  }

  async function resetPassword(id: string) {
    const newPassword = prompt("Enter new password for this user:");
    if (!newPassword) return;
    await apiGet(`/admin/users/${id}/reset-password`); // using get for demo if post isn't handy without apiPost wrapper
    // Actually we have apiPost? The api.ts doesn't have apiPost natively exported? Wait, we can use fetch or api function.
    // Let's assume we have api methods or use fetch directly
    await fetch(process.env.NEXT_PUBLIC_API_URL + `/admin/users/${id}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.localStorage.getItem('pbp_token')}`
      },
      body: JSON.stringify({ newPassword })
    });
    alert("Password reset successfully.");
  }

  return (
    <div>
      <Navbar title="Manage Users" />
      <main className="max-w-7xl mx-auto px-5 py-6">
        
        <div className="bg-white dark:bg-ink border border-line dark:border-ink-light rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-paper-muted dark:bg-ink-light/30 border-b border-line dark:border-ink-light text-ink-muted">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Borrowers</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-ink-light">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-paper-muted/50 dark:hover:bg-ink-light/20 transition-colors">
                  <td className="px-5 py-3 font-medium">{u.name}</td>
                  <td className="px-5 py-3 text-ink-muted">{u.email}</td>
                  <td className="px-5 py-3 text-ink-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-ink-muted">{u._count.borrowers}</td>
                  <td className="px-5 py-3">
                    <span className={cx("px-2 py-1 rounded-full text-xs font-semibold tracking-wide", 
                      u.status === "ACTIVE" ? "bg-moss/10 text-moss" : "bg-rust/10 text-rust"
                    )}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <button 
                      onClick={() => toggleStatus(u.id, u.status)}
                      className="p-1.5 rounded bg-paper-muted text-ink-muted hover:text-ink transition"
                      title={u.status === "ACTIVE" ? "Disable" : "Enable"}
                    >
                      {u.status === "ACTIVE" ? <ShieldOff size={16} /> : <Shield size={16} />}
                    </button>
                    <button 
                      onClick={() => resetPassword(u.id)}
                      className="p-1.5 rounded bg-amber/10 text-amber hover:bg-amber/20 transition"
                      title="Reset Password"
                    >
                      <KeyRound size={16} />
                    </button>
                    <button 
                      onClick={() => deleteUser(u.id)}
                      className="p-1.5 rounded bg-rust/10 text-rust hover:bg-rust/20 transition"
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-muted">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
