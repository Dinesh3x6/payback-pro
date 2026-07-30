"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { apiGet } from "@/lib/api";
import { XCircle } from "lucide-react";

export default function AdminSessions() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetchSessions();
  }, []);

  function fetchSessions() {
    apiGet("/admin/sessions").then(res => setSessions((res as any[]) || []));
  }

  async function terminateSession(id: string) {
    if (!confirm("Terminate this session? The user will be logged out immediately.")) return;
    
    await fetch(process.env.NEXT_PUBLIC_API_URL + `/admin/sessions/${id}/terminate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('pbp_token')}`
      }
    });
    fetchSessions();
  }

  return (
    <div>
      <Navbar title="Active Sessions" />
      <main className="max-w-7xl mx-auto px-5 py-6">
        
        <div className="bg-white dark:bg-ink border border-line dark:border-ink-light rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-paper-muted dark:bg-ink-light/30 border-b border-line dark:border-ink-light text-ink-muted">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">IP Address</th>
                <th className="px-5 py-3 font-medium">Device/Browser</th>
                <th className="px-5 py-3 font-medium">Last Activity</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-ink-light">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-paper-muted/50 dark:hover:bg-ink-light/20 transition-colors">
                  <td className="px-5 py-3 font-medium">
                    {s.user.name} <span className="text-xs text-ink-muted ml-1">({s.user.email})</span>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{s.ipAddress || 'Unknown'}</td>
                  <td className="px-5 py-3 text-ink-muted">
                    {s.device || 'Unknown'} • {s.browser || 'Unknown'}
                  </td>
                  <td className="px-5 py-3 text-ink-muted">
                    {new Date(s.lastActivityAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button 
                      onClick={() => terminateSession(s.id)}
                      className="p-1.5 rounded bg-rust/10 text-rust hover:bg-rust/20 transition"
                      title="Terminate Session"
                    >
                      <XCircle size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-muted">No active sessions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
