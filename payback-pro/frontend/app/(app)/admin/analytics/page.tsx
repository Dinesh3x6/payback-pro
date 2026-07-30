"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { apiGet } from "@/lib/api";
import { StatCard } from "@/components/stat-card";
import { Activity, Mail, Bell, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiGet("/admin/analytics").then(res => setData(res));
  }, []);

  if (!data) return <div className="p-10 flex justify-center text-ink-muted">Loading Analytics...</div>;

  return (
    <div>
      <Navbar title="System Analytics" />
      <main className="max-w-7xl mx-auto px-5 py-6 space-y-8">
        
        <section>
          <h2 className="text-lg font-display font-semibold mb-4 text-ink flex items-center gap-2">
            <Activity size={20} className="text-moss" /> System Health
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stub-card p-5">
              <div className="flex justify-between mb-3">
                <Mail className="text-ink-muted" size={20} />
                <span className="text-xs font-bold text-moss">Reliability</span>
              </div>
              <h3 className="text-2xl font-bold font-display">{data.emailSuccessRate.toFixed(1)}%</h3>
              <p className="text-sm text-ink-muted mt-1">Email Delivery Success</p>
            </div>
            
            <div className="stub-card p-5">
              <div className="flex justify-between mb-3">
                <Bell className="text-ink-muted" size={20} />
                <span className="text-xs font-bold text-moss">Reliability</span>
              </div>
              <h3 className="text-2xl font-bold font-display">{data.reminderSuccessRate.toFixed(1)}%</h3>
              <p className="text-sm text-ink-muted mt-1">Reminder Delivery Success</p>
            </div>

            <div className="stub-card p-5">
              <div className="flex justify-between mb-3">
                <ShieldAlert className="text-rust" size={20} />
                <span className="text-xs font-bold text-rust">Errors</span>
              </div>
              <h3 className="text-2xl font-bold font-display text-rust">{data.emailFailed}</h3>
              <p className="text-sm text-ink-muted mt-1">Failed Emails</p>
            </div>

            <div className="stub-card p-5">
              <div className="flex justify-between mb-3">
                <ShieldAlert className="text-rust" size={20} />
                <span className="text-xs font-bold text-rust">Errors</span>
              </div>
              <h3 className="text-2xl font-bold font-display text-rust">{data.reminderFailed}</h3>
              <p className="text-sm text-ink-muted mt-1">Failed Reminders</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
