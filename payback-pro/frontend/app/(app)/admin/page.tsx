"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { apiGet } from "@/lib/api";
import { Users, LayoutDashboard, Wallet, CreditCard, Mail, Bell, Clock, LogIn, UserPlus } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiGet("/admin/dashboard").then(res => setData(res));
  }, []);

  if (!data) return <div className="p-10 flex justify-center text-ink-muted">Loading Admin Dashboard...</div>;

  return (
    <div>
      <Navbar title="Admin Dashboard" />
      <main className="max-w-7xl mx-auto px-5 py-6 space-y-8">
        
        <section>
          <h2 className="text-lg font-display font-semibold mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <StatCard label="Total Users" value={data.totalUsers} icon={Users} tone="moss" />
            <StatCard label="Users Today" value={data.usersToday} icon={UserPlus} tone="moss" />
            <StatCard label="Active Sessions" value={data.activeSessions} icon={Clock} tone="amber" />
            <StatCard label="Total Borrowers" value={data.totalBorrowers} icon={Users} />
            <StatCard label="Total Loans" value={data.totalLoans} icon={LayoutDashboard} />
            <StatCard label="Total Outstanding" value={formatCurrency(data.totalOutstandingAmount)} icon={Wallet} tone="amber" />
            <StatCard label="Total Recovered" value={formatCurrency(data.totalRecoveredAmount)} icon={CreditCard} tone="moss" />
            <StatCard label="Emails Sent" value={data.emailsSent} icon={Mail} />
            <StatCard label="Reminders Sent" value={data.remindersSent} icon={Bell} />
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          <div className="stub-card p-5">
            <h3 className="label-text mb-4 text-moss">Recent Registrations</h3>
            <div className="space-y-3">
              {data.recentRegistrations?.map((u: any) => (
                <div key={u.id} className="flex justify-between items-center text-sm border-b border-line dark:border-ink-light pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-ink-muted">{u.email}</p>
                  </div>
                  <span className="text-xs text-ink-muted">{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="stub-card p-5">
            <h3 className="label-text mb-4 text-amber">Recent Logins</h3>
            <div className="space-y-3">
              {data.recentLogins?.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center text-sm border-b border-line dark:border-ink-light pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{s.user.name}</p>
                    <p className="text-xs text-ink-muted">{s.ipAddress || 'Unknown IP'} • {s.browser}</p>
                  </div>
                  <span className="text-xs text-ink-muted">{new Date(s.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        
      </main>
    </div>
  );
}
