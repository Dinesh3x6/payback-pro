export interface Repayment {
  id: string;
  amount: string;
  paidAt: string;
  note?: string;
}

export interface Loan {
  id: string;
  principal: string;
  interestRate: string;
  status: string;
  dueDate: string | null;
  repayments: Repayment[];
  createdAt?: string; // some endpoints might return this
}

export interface Reminder {
  id: string;
  channels: string[];
  message: string;
  status: string;
  createdAt: string;
}

export interface Borrower {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt?: string;
  loans: Loan[];
  reminders?: Reminder[];
}


export interface UnifiedEvent {
  id: string;
  type: "BORROWER_ADDED" | "LOAN_CREATED" | "REMINDER_SENT" | "PAYMENT_RECORDED";
  title: string;
  description: string;
  date: string;
  iconType: string;
}

export interface UpcomingPayment {
  borrowerId: string;
  borrowerName: string;
  loanId: string;
  amount: number;
  dueDate: string;
  daysRemaining: number;
  status: string;
  loan: Loan;
}

export interface OverdueLoan {
  borrowerId: string;
  borrowerName: string;
  loanId: string;
  pendingAmount: number;
  dueDate: string;
  daysOverdue: number;
  status: string;
  loan: Loan;
}

export interface RecentPayment {
  borrowerId: string;
  borrowerName: string;
  amount: number;
  date: string;
  note?: string;
  remainingBalance: number;
}

export interface DashboardData {
  stats: {
    totalLent: number;
    totalRecovered: number;
    outstanding: number;
    recoveryRate: number;
    activeLoans: number;
    overdueLoans: number;
    borrowersCount: number;
    interestEarned: number;
    monthlyCollections: number;
    upcomingDue: number;
  };
  priorities: (UpcomingPayment | OverdueLoan)[];
  upcomingPayments: UpcomingPayment[];
  overdueLoans: OverdueLoan[];
  recentPayments: RecentPayment[];
  activityTimeline: UnifiedEvent[];
  notifications: UnifiedEvent[];
  charts: {
    cashFlow: { month: string; lent: number; recovered: number }[];
    statusDistribution: { name: string; value: number; color: string }[];
    pendingVsPaid: { name: string; value: number; color: string }[];
  };
}

export function computeDashboardData(borrowers: Borrower[], dateFilter?: { from: Date; to: Date }): DashboardData {
  let totalLent = 0;
  let totalRecovered = 0;
  let activeLoans = 0;
  let overdueLoansCount = 0;
  let interestEarned = 0;
  let monthlyCollections = 0;
  let upcomingDue = 0;

  const now = new Date();
  const currentMonthKey = now.toLocaleDateString("en-US", { year: "numeric", month: "long" });

  const events: UnifiedEvent[] = [];
  const upcomingPayments: UpcomingPayment[] = [];
  const overdueLoans: OverdueLoan[] = [];
  const recentPayments: RecentPayment[] = [];
  
  const cashFlowMap = new Map<string, { lent: number; recovered: number }>();
  let paidLoans = 0;
  let partialLoans = 0;

  for (const b of borrowers) {
    // Borrower Added Event
    if ((b as any).createdAt) {
      const bDate = new Date((b as any).createdAt);
      if (!dateFilter || (bDate >= dateFilter.from && bDate <= dateFilter.to)) {
        events.push({
          id: `b_${b.id}`,
          type: "BORROWER_ADDED",
          title: "Borrower Added",
          description: `Added ${b.name} to the system.`,
          date: (b as any).createdAt,
          iconType: "user",
        });
      }
    }

    // Reminders
    if ((b as any).reminders) {
      for (const rem of (b as any).reminders) {
        const remDate = new Date(rem.createdAt);
        if (!dateFilter || (remDate >= dateFilter.from && remDate <= dateFilter.to)) {
          events.push({
            id: `rem_${rem.id}`,
            type: "REMINDER_SENT",
            title: "Reminder Sent",
            description: `Sent reminder to ${b.name} via ${rem.channels?.join(", ")}`,
            date: rem.createdAt,
            iconType: "bell",
          });
        }
      }
    }

    for (const l of b.loans) {
      const principal = Number(l.principal);
      const interestRate = Number(l.interestRate ?? 0);
      const interest = principal * (interestRate / 100);
      const totalOwed = principal + interest;
      
      totalLent += principal;
      interestEarned += interest;

      if (l.status === "PAID") paidLoans++;
      else if (l.status === "PARTIAL") partialLoans++;
      else if (l.status === "OVERDUE") overdueLoansCount++;
      else activeLoans++;

      // Loan Created Event
      if ((l as any).createdAt) {
        const lDate = new Date((l as any).createdAt);
        
        if (!dateFilter || (lDate >= dateFilter.from && lDate <= dateFilter.to)) {
          events.push({
            id: `l_${l.id}`,
            type: "LOAN_CREATED",
            title: "Loan Created",
            description: `Lent ₹${principal.toFixed(2)} to ${b.name}`,
            date: (l as any).createdAt,
            iconType: "wallet",
          });
  
          const monthKey = lDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          const cf = cashFlowMap.get(monthKey) || { lent: 0, recovered: 0 };
          cf.lent += principal;
          cashFlowMap.set(monthKey, cf);
        }
      }

      let paid = 0;
      for (const r of l.repayments || []) {
        const amt = Number(r.amount);
        paid += amt;
        totalRecovered += amt;

        const rDate = new Date(r.paidAt);
        if (rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear()) {
          monthlyCollections += amt;
        }

        if (!dateFilter || (rDate >= dateFilter.from && rDate <= dateFilter.to)) {
          const monthKey = rDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          const cf = cashFlowMap.get(monthKey) || { lent: 0, recovered: 0 };
          cf.recovered += amt;
          cashFlowMap.set(monthKey, cf);
  
          // Payment Recorded Event
          events.push({
            id: `p_${r.id}`,
            type: "PAYMENT_RECORDED",
            title: "Payment Recorded",
            description: `${b.name} paid ₹${amt.toFixed(2)}${r.note ? ` (${r.note})` : ""}`,
            date: r.paidAt,
            iconType: "check",
          });
        }
      }

      const remaining = Math.max(totalOwed - paid, 0);

      // Add to Recent Payments (we'll sort later)
      for (const r of l.repayments || []) {
        recentPayments.push({
          borrowerId: b.id,
          borrowerName: b.name,
          amount: Number(r.amount),
          date: r.paidAt,
          note: r.note,
          remainingBalance: remaining, // Approximation for the table display
        });
      }

      if (l.dueDate && remaining > 0) {
        const dueDate = new Date(l.dueDate);
        const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

        if (daysDiff < 0) {
          overdueLoans.push({
            borrowerId: b.id,
            borrowerName: b.name,
            loanId: l.id,
            pendingAmount: remaining,
            dueDate: l.dueDate,
            daysOverdue: Math.abs(daysDiff),
            status: l.status,
            loan: l,
          });
        } else {
          upcomingDue++;
          upcomingPayments.push({
            borrowerId: b.id,
            borrowerName: b.name,
            loanId: l.id,
            amount: remaining,
            dueDate: l.dueDate,
            daysRemaining: daysDiff,
            status: l.status,
            loan: l,
          });
        }
      }
    }
  }

  // Sorting
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  recentPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  upcomingPayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  overdueLoans.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Priorities: Overdue loans + Upcoming loans (due in <= 3 days)
  const priorities = [
    ...overdueLoans,
    ...upcomingPayments.filter(p => p.daysRemaining <= 3)
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Charts data
  const outstanding = (totalLent + interestEarned) - totalRecovered;
  const recoveryRate = (totalLent + interestEarned) > 0 ? (totalRecovered / (totalLent + interestEarned)) * 100 : 0;

  const cashFlow = Array.from(cashFlowMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  return {
    stats: {
      totalLent,
      totalRecovered,
      outstanding: Math.max(outstanding, 0),
      recoveryRate,
      activeLoans,
      overdueLoans: overdueLoansCount,
      borrowersCount: borrowers.length,
      interestEarned,
      monthlyCollections,
      upcomingDue,
    },
    priorities,
    upcomingPayments,
    overdueLoans,
    recentPayments: recentPayments.slice(0, 10),
    activityTimeline: events.slice(0, 15), // top 15
    notifications: events.filter(e => e.type === "REMINDER_SENT" || e.type === "PAYMENT_RECORDED").slice(0, 5),
    charts: {
      cashFlow,
      statusDistribution: [
        { name: "Active", value: activeLoans, color: "#B8862B" },
        { name: "Partial", value: partialLoans, color: "#B4552D" },
        { name: "Paid", value: paidLoans, color: "#3F6B4F" },
        { name: "Overdue", value: overdueLoansCount, color: "#A52A2A" },
      ].filter(d => d.value > 0),
      pendingVsPaid: [
        { name: "Recovered", value: totalRecovered, color: "#3F6B4F" },
        { name: "Pending", value: Math.max(outstanding, 0), color: "#B8862B" },
      ].filter(d => d.value > 0),
    }
  };
}
