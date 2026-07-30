"use client";

import { Wallet, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Navbar } from "@/components/navbar";
import { StatCard } from "@/components/stat-card";
import { useDashboard } from "@/hooks/use-dashboard";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const COLORS = { pending: "#B8862B", partiallyPaid: "#B4552D", paid: "#3F6B4F" };

export default function DashboardPage() {
  const { stats, loading } = useDashboard();

  const chartData = stats
    ? [
        { name: "Pending", value: stats.statusBreakdown.pending, color: COLORS.pending },
        { name: "Partially paid", value: stats.statusBreakdown.partiallyPaid, color: COLORS.partiallyPaid },
        { name: "Paid", value: stats.statusBreakdown.paid, color: COLORS.paid },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div>
      <Navbar title="Dashboard" />
      <main className="px-5 py-6 max-w-6xl mx-auto">
        {loading || !stats ? (
          <p className="text-sm text-ink-muted">Loading your ledger…</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total lent" value={formatCurrency(stats.totalLent)} icon={Wallet} />
              <StatCard
                label="Total pending"
                value={formatCurrency(stats.totalPending)}
                icon={Clock}
                tone="amber"
              />
              <StatCard
                label="Total recovered"
                value={formatCurrency(stats.totalRecovered)}
                icon={CheckCircle2}
                tone="moss"
              />
              <StatCard
                label="Overdue"
                value={formatCurrency(stats.overdueAmount)}
                icon={AlertTriangle}
                tone="rust"
                sublabel={`${stats.overdueCount} borrower${stats.overdueCount === 1 ? "" : "s"}`}
              />
            </div>

            <div className="mt-6 grid lg:grid-cols-3 gap-4">
              <div className="stub-card p-6 pt-7 lg:col-span-1">
                <span className="label-text">Status breakdown</span>
                {chartData.length === 0 ? (
                  <p className="text-sm text-ink-muted mt-8 text-center">No borrowers yet</p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={24} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="stub-card p-6 pt-7 lg:col-span-2 flex flex-col justify-between">
                <div>
                  <span className="label-text">Quick actions</span>
                  <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                    You have {stats.borrowerCount} borrower{stats.borrowerCount === 1 ? "" : "s"} on your ledger.
                    {stats.overdueCount > 0
                      ? ` ${stats.overdueCount} of them ${stats.overdueCount === 1 ? "is" : "are"} overdue right now.`
                      : " Nothing is overdue — nicely kept."}
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/borrowers?new=1" className="btn-primary">Add a borrower</Link>
                  <Link href="/borrowers?status=PENDING" className="btn-secondary">View pending</Link>
                  <Link href="/borrowers?overdue=1" className="btn-secondary">View overdue</Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
