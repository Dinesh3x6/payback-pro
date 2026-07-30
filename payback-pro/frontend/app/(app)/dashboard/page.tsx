"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Wallet, Clock, CheckCircle2, AlertTriangle, Users, TrendingUp, Calendar, ArrowUpRight, 
  Search, Plus, Bell, Download, FileText, Phone, Mail, Activity, CreditCard, Sparkles
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Navbar } from "@/components/navbar";
import { StatCard } from "@/components/stat-card";
import { apiGet } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { computeDashboardData, DashboardData, Borrower, UpcomingPayment, OverdueLoan, UnifiedEvent } from "@/lib/dashboard-data";
import { AIEngine } from "@/lib/ai-engine";
import toast from "react-hot-toast";

// --- Subcomponents for specific sections ---

function ActionButtons({ borrowerId }: { borrowerId: string }) {
  return (
    <div className="flex gap-1.5 mt-3">
      <Link href={`/borrowers/${borrowerId}`} className="btn-secondary text-xs !py-1 !px-2 flex-1 text-center border border-line dark:border-ink-light">
        <Phone size={12} className="inline mr-1" /> Call
      </Link>
      <Link href={`/borrowers/${borrowerId}`} className="btn-secondary text-xs !py-1 !px-2 flex-1 text-center border border-line dark:border-ink-light">
        <Bell size={12} className="inline mr-1" /> Remind
      </Link>
      <Link href={`/borrowers/${borrowerId}`} className="btn-secondary text-xs !py-1 !px-2 flex-1 text-center bg-ink text-white dark:bg-paper dark:text-ink hover:opacity-90">
        <CreditCard size={12} className="inline mr-1" /> Pay
      </Link>
    </div>
  );
}

function PriorityCard({ data, type }: { data: UpcomingPayment | OverdueLoan, type: 'upcoming' | 'overdue' }) {
  const isOverdue = type === 'overdue';
  const item = data as OverdueLoan & UpcomingPayment;
  return (
    <div className="stub-card p-4 hover:border-ink/20 dark:hover:border-paper/20 transition group">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${isOverdue ? 'bg-rust-light text-rust' : 'bg-amber-light text-amber'}`}>
            {item.borrowerName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <Link href={`/borrowers/${item.borrowerId}`} className="font-semibold text-sm hover:underline group-hover:text-ink dark:group-hover:text-paper">
              {item.borrowerName}
            </Link>
            <p className="text-xs text-ink-muted">Due: {formatDate(item.dueDate)}</p>
          </div>
        </div>
        <span className={`badge text-[10px] ${isOverdue ? 'bg-rust text-white border-transparent' : 'bg-amber text-white border-transparent'}`}>
          {isOverdue ? `${item.daysOverdue}d overdue` : `${item.daysRemaining}d left`}
        </span>
      </div>
      <div className="mt-3">
        <span className="text-sm text-ink-muted block mb-0.5">Outstanding Amount</span>
        <span className={`text-lg font-display font-semibold tabular ${isOverdue ? 'text-rust' : 'text-amber'}`}>
          {formatCurrency(item.amount || item.pendingAmount)}
        </span>
      </div>
      <ActionButtons borrowerId={item.borrowerId} />
    </div>
  );
}

function ActivityItem({ event }: { event: UnifiedEvent }) {
  const icons: Record<string, any> = {
    "BORROWER_ADDED": <Users size={14} className="text-blue-600" />,
    "LOAN_CREATED": <Wallet size={14} className="text-amber-600" />,
    "REMINDER_SENT": <Bell size={14} className="text-purple-600" />,
    "PAYMENT_RECORDED": <CheckCircle2 size={14} className="text-moss" />
  };

  return (
    <div className="relative pl-6 pb-4 last:pb-0">
      <div className="absolute left-1.5 top-1.5 w-px h-full bg-line dark:bg-ink-light -translate-x-1/2 last:hidden"></div>
      <div className="absolute left-1.5 top-1.5 w-6 h-6 rounded-full bg-paper-muted dark:bg-ink flex items-center justify-center -translate-x-1/2 shadow-sm border border-line dark:border-ink-light">
        {icons[event.type] || <Activity size={14} />}
      </div>
      <div>
        <p className="text-sm font-medium">{event.title}</p>
        <p className="text-xs text-ink-muted mt-0.5">{event.description}</p>
        <p className="text-[10px] text-ink-muted mt-1">{new Date(event.date).toLocaleString()}</p>
      </div>
    </div>
  );
}

// --- Main Dashboard Page ---

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"30d" | "3m" | "6m" | "1y" | "all">("all");
  const [rawBorrowers, setRawBorrowers] = useState<Borrower[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const borrowers = await apiGet<Borrower[]>("/borrowers");
      setRawBorrowers(borrowers);
      setData(computeDashboardData(borrowers));
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  const dateFilter = useMemo(() => {
    if (dateRange === "all") return undefined;
    const to = new Date();
    const from = new Date();
    if (dateRange === "30d") from.setDate(from.getDate() - 30);
    else if (dateRange === "3m") from.setMonth(from.getMonth() - 3);
    else if (dateRange === "6m") from.setMonth(from.getMonth() - 6);
    else if (dateRange === "1y") from.setFullYear(from.getFullYear() - 1);
    return { from, to };
  }, [dateRange]);

  // Handle Search Filtering
  const displayData = useMemo(() => {
    if (!rawBorrowers) return data;
    const q = search.trim().toLowerCase();
    const filtered = q 
      ? rawBorrowers.filter(b => 
          b.name.toLowerCase().includes(q) || 
          b.email?.toLowerCase().includes(q) || 
          b.phone?.toLowerCase().includes(q)
        )
      : rawBorrowers;
    return computeDashboardData(filtered, dateFilter);
  }, [search, rawBorrowers, data, dateFilter]);

  if (loading || !displayData) {
    return (
      <div>
        <Navbar title="Dashboard" />
        <main className="px-5 py-6 max-w-7xl mx-auto flex items-center justify-center h-[50vh]">
          <div className="animate-pulse flex flex-col items-center">
            <Activity className="text-ink-muted mb-2 animate-bounce" />
            <p className="text-sm text-ink-muted">Loading your financial dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  const { stats, charts, priorities, activityTimeline, upcomingPayments, overdueLoans, recentPayments, notifications } = displayData;

  return (
    <div className="pb-20">
      <Navbar title="Dashboard" />
      
      {/* Search and Quick Actions Bar */}
      <div className="sticky top-0 z-30 bg-paper/80 dark:bg-ink-dark/80 backdrop-blur-md border-b border-line dark:border-ink-light px-5 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search borrower, email, phone..."
              className="w-full bg-white dark:bg-ink pl-9 pr-4 py-2 rounded-full border border-line dark:border-ink-light text-sm focus:outline-none focus:border-ink dark:focus:border-paper transition shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="text-sm bg-paper-muted dark:bg-ink border border-line dark:border-ink-light rounded-full px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="30d">Last 30 Days</option>
              <option value="3m">Last 3 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last Year</option>
              <option value="all">All Time</option>
            </select>
            <div className="h-5 w-px bg-line dark:bg-ink-light mx-1"></div>
            <Link href="/borrowers" className="btn-primary text-xs whitespace-nowrap"><Plus size={14} className="inline mr-1"/> Borrower</Link>
          </div>
        </div>
      </div>

      <main className="px-5 py-6 max-w-7xl mx-auto space-y-8">
        
        {/* AI Business Copilot Widget */}
        {(() => {
          const copilot = new AIEngine({ borrowers: rawBorrowers }).getBusinessCopilotBriefing();
          return (
            <section className="stub-card p-6 border-l-4 border-moss relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-moss/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col md:flex-row gap-6 relative z-10">
                
                {/* Left: Health Score & Briefing */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={20} className="text-moss" />
                    <h2 className="font-display font-semibold text-xl">AI Business Copilot</h2>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={`shrink-0 w-16 h-16 rounded-full flex items-center justify-center font-display font-bold text-2xl shadow-inner border-[3px] border-paper dark:border-ink-dark
                      ${copilot.healthScore >= 80 ? 'bg-moss-light text-moss' : copilot.healthScore >= 50 ? 'bg-amber-light text-amber' : 'bg-rust-light text-rust'}
                    `}>
                      {copilot.healthScore}
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted uppercase tracking-wider font-semibold mb-1">Today's Collection Health</p>
                      <p className="text-sm font-medium leading-relaxed max-w-md">{copilot.dailyBriefing}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Insights Grid */}
                <div className="flex-[1.5] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div className="bg-paper-muted dark:bg-ink/50 p-4 rounded-xl border border-line dark:border-ink-light">
                    <h4 className="text-xs text-ink-muted flex items-center gap-1.5 mb-2 font-semibold uppercase tracking-wider"><AlertTriangle size={12} className={copilot.riskAlerts.length > 0 && !copilot.riskAlerts[0].includes("idle") ? "text-rust" : "text-amber"}/> Things to Watch</h4>
                    <ul className="text-sm space-y-2">
                      {copilot.riskAlerts.length === 0 ? <li className="text-moss font-medium">No critical risks detected. 🎉</li> : null}
                      {copilot.riskAlerts.map((alert, i) => (
                        <li key={i} className="flex gap-2"><span className="text-rust opacity-70 mt-0.5">•</span> <span className="text-ink-muted leading-tight">{alert}</span></li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-paper-muted dark:bg-ink/50 p-4 rounded-xl border border-line dark:border-ink-light">
                    <h4 className="text-xs text-ink-muted flex items-center gap-1.5 mb-2 font-semibold uppercase tracking-wider"><TrendingUp size={12} className="text-moss"/> Today's Suggestion</h4>
                    <ul className="text-sm space-y-2">
                      {copilot.cashFlowRecommendations.length === 0 ? <li className="text-ink-muted">No specific recommendations right now.</li> : null}
                      {copilot.cashFlowRecommendations.map((rec, i) => (
                        <li key={i} className="flex gap-2"><span className="text-moss opacity-70 mt-0.5">•</span> <span className="text-ink-muted leading-tight">{rec}</span></li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>
            </section>
          );
        })()}

        {/* 1. TOP SUMMARY SECTION (10 Cards) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold">Financial Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <StatCard label="Total Lent" value={formatCurrency(stats.totalLent)} icon={Wallet} />
            <StatCard label="Total Recovered" value={formatCurrency(stats.totalRecovered)} icon={CheckCircle2} tone="moss" />
            <StatCard label="Outstanding Balance" value={formatCurrency(stats.outstanding)} icon={Clock} tone={stats.outstanding > 0 ? "amber" : "moss"} />
            <StatCard label="Recovery Rate" value={`${stats.recoveryRate.toFixed(1)}%`} icon={TrendingUp} tone={stats.recoveryRate >= 50 ? "moss" : "rust"} />
            <StatCard label="Interest Earned" value={formatCurrency(stats.interestEarned)} icon={ArrowUpRight} tone="moss" />
            
            <StatCard label="Monthly Collections" value={formatCurrency(stats.monthlyCollections)} icon={Calendar} tone="moss" />
            <StatCard label="Active Loans" value={String(stats.activeLoans)} icon={Activity} tone="amber" />
            <StatCard label="Overdue Loans" value={String(stats.overdueLoans)} icon={AlertTriangle} tone={stats.overdueLoans > 0 ? "rust" : "moss"} />
            <StatCard label="Upcoming Dues" value={String(stats.upcomingDue)} icon={Clock} />
            <StatCard label="Total Borrowers" value={String(stats.borrowersCount)} icon={Users} />
          </div>
        </section>

        {/* 2. TODAY'S PRIORITIES */}
        {priorities.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                <AlertTriangle size={18} className="text-rust" /> Today's Priorities
              </h2>
            </div>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {priorities.slice(0, 4).map((p) => (
                <PriorityCard key={`p_${p.loanId}`} data={p} type={'daysOverdue' in p ? 'overdue' : 'upcoming'} />
              ))}
            </div>
          </section>
        )}

        {/* 3. MONTHLY ANALYTICS */}
        <section className="grid lg:grid-cols-3 gap-5">
          <div className="stub-card p-5 lg:col-span-2">
            <h3 className="label-text mb-4">Cash Flow ({dateRange === "all" ? "All Time" : dateRange === "1y" ? "Last Year" : dateRange === "6m" ? "Last 6 Months" : dateRange === "3m" ? "Last 3 Months" : "Last 30 Days"})</h3>
            <div className="h-64">
              {charts.cashFlow.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-sm text-ink-muted bg-paper-muted/30 dark:bg-ink/30 rounded-xl border border-dashed border-line dark:border-ink-light">
                  <Activity size={24} className="mb-2 opacity-30" />
                  No historical data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.cashFlow}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tw-shadow-color, #E4DFD2)" opacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="lent" name="Amount Lent" fill="#B8862B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="recovered" name="Amount Recovered" fill="#3F6B4F" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid gap-5">
            <div className="stub-card p-5">
              <h3 className="label-text mb-2">Loan Status Distribution</h3>
              <div className="h-40">
                {charts.statusDistribution.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-ink-muted">No historical data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.statusDistribution} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={2}>
                        {charts.statusDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: any) => Number(value)} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            
            <div className="stub-card p-5">
              <h3 className="label-text mb-2">Pending vs Recovered</h3>
              {charts.pendingVsPaid.length === 0 ? (
                  <div className="w-full h-24 flex items-center justify-center text-sm text-ink-muted">No historical data available.</div>
              ) : (
                <>
                  <div className="h-10 mt-6 bg-paper-muted dark:bg-ink rounded-full overflow-hidden flex shadow-inner relative">
                    {charts.pendingVsPaid.map((item, i) => {
                      const total = charts.pendingVsPaid.reduce((acc, curr) => acc + curr.value, 0);
                      const percent = total > 0 ? (item.value / total) * 100 : 0;
                      return (
                        <div key={i} className="h-full flex items-center justify-center transition-all duration-1000" style={{ width: `${percent}%`, backgroundColor: item.color }}>
                          {percent > 10 && <span className="text-white text-xs font-semibold">{percent.toFixed(0)}%</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-3 text-xs font-medium">
                    <span className="text-moss">Recovered: {formatCurrency(stats.totalRecovered)}</span>
                    <span className="text-amber">Pending: {formatCurrency(stats.outstanding)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 4. ACTIVITY & TABLES */}
        <section className="grid lg:grid-cols-3 gap-5">
          {/* Recent Activity Timeline */}
          <div className="stub-card p-5 lg:col-span-1 max-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="label-text mb-0">Recent Activity</h3>
              <span className="text-[10px] text-ink-muted uppercase tracking-wider bg-paper-muted dark:bg-ink px-2 py-0.5 rounded-full">Live</span>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 scrollbar-thin">
              {activityTimeline.length === 0 ? (
                <p className="text-sm text-ink-muted text-center mt-10">No recent activity.</p>
              ) : (
                activityTimeline.map(event => <ActivityItem key={event.id} event={event} />)
              )}
            </div>
          </div>

          {/* Tables Section */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Overdue Loans */}
            <div className="stub-card overflow-hidden">
              <div className="p-4 border-b border-line dark:border-ink-light bg-rust-light/20 flex justify-between items-center">
                <h3 className="label-text mb-0 text-rust flex items-center gap-1.5"><AlertTriangle size={14} /> Overdue Loans</h3>
                <span className="badge bg-rust text-white border-transparent text-xs">{overdueLoans.length}</span>
              </div>
              <div className="overflow-x-auto max-h-60 scrollbar-thin">
                <table className="w-full text-sm text-left">
                  <thead className="bg-paper-muted/50 dark:bg-ink/50 text-xs text-ink-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-medium">Borrower</th>
                      <th className="px-4 py-2 font-medium">Amount</th>
                      <th className="px-4 py-2 font-medium">Overdue</th>
                      <th className="px-4 py-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueLoans.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center">
                          <p className="text-sm font-medium text-moss mb-1">No overdue loans! 🎉</p>
                          <p className="text-xs text-ink-muted">Your borrowers are paying on time.</p>
                        </td>
                      </tr>
                    )}
                    {overdueLoans.map((loan, i) => (
                      <tr key={i} className="border-b border-line/50 dark:border-ink-light/50 last:border-0 hover:bg-paper-muted/30">
                        <td className="px-4 py-2.5 font-medium"><Link href={`/borrowers/${loan.borrowerId}`} className="hover:underline">{loan.borrowerName}</Link></td>
                        <td className="px-4 py-2.5 tabular text-rust font-medium">{formatCurrency(loan.pendingAmount)}</td>
                        <td className="px-4 py-2.5 tabular">{loan.daysOverdue} days</td>
                        <td className="px-4 py-2.5 text-right">
                          <Link href={`/borrowers/${loan.borrowerId}`} className="text-xs text-ink-muted hover:text-ink underline">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="stub-card overflow-hidden">
              <div className="p-4 border-b border-line dark:border-ink-light bg-moss-light/20 flex justify-between items-center">
                <h3 className="label-text mb-0 text-moss flex items-center gap-1.5"><CheckCircle2 size={14} /> Recent Payments</h3>
                <span className="badge bg-moss text-white border-transparent text-xs">Last 10</span>
              </div>
              <div className="overflow-x-auto max-h-60 scrollbar-thin">
                <table className="w-full text-sm text-left">
                  <thead className="bg-paper-muted/50 dark:bg-ink/50 text-xs text-ink-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-medium">Borrower</th>
                      <th className="px-4 py-2 font-medium">Amount</th>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center">
                          <p className="text-sm font-medium text-ink-muted mb-1">No payments recorded yet.</p>
                          <Link href="/borrowers" className="text-xs text-moss hover:underline">Go to a borrower to record a payment</Link>
                        </td>
                      </tr>
                    )}
                    {recentPayments.map((payment, i) => (
                      <tr key={i} className="border-b border-line/50 dark:border-ink-light/50 last:border-0 hover:bg-paper-muted/30">
                        <td className="px-4 py-2.5 font-medium"><Link href={`/borrowers/${payment.borrowerId}`} className="hover:underline">{payment.borrowerName}</Link></td>
                        <td className="px-4 py-2.5 tabular text-moss font-medium">+{formatCurrency(payment.amount)}</td>
                        <td className="px-4 py-2.5 tabular text-xs text-ink-muted">{formatDate(payment.date)}</td>
                        <td className="px-4 py-2.5 text-xs text-ink-muted">{payment.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
