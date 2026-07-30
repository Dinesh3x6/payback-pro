import { formatCurrency } from "./utils";

// --- Types needed for AI Context ---
interface Repayment { amount: string; paidAt: string; }
interface Loan { principal: string; interestRate: string; dueDate: string | null; repayments: Repayment[]; }
interface RawBorrower { id: string; name: string; loans: Loan[]; tags?: string[]; }

export interface CopilotBriefing {
  healthScore: number;
  dailyBriefing: string;
  riskAlerts: string[];
  cashFlowRecommendations: string[];
}

interface AIEngineContext {
  borrowers: RawBorrower[];
}

export class AIEngine {
  private ctx: AIEngineContext;

  constructor(context: AIEngineContext) {
    this.ctx = context;
  }

  // --- Internal Data Processing ---
  private processData() {
    const now = new Date();
    let totalLent = 0;
    let totalRecovered = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let highRiskCount = 0;

    const borrowerStats = this.ctx.borrowers.map(b => {
      let owed = 0;
      let paid = 0;
      let isOverdue = false;
      let overdueAmount = 0;
      let maxOverdueDays = 0;

      if (b.loans && Array.isArray(b.loans)) {
        b.loans.forEach(l => {
          const principal = Number(l.principal);
        const interest = principal * (Number(l.interestRate) / 100);
        const total = principal + interest;
        owed += total;
        
        let loanPaid = 0;
        if (l.repayments && Array.isArray(l.repayments)) {
          l.repayments.forEach(r => loanPaid += Number(r.amount));
        }
        paid += loanPaid;

          const remaining = total - loanPaid;
          if (remaining > 0 && l.dueDate) {
            const dDate = new Date(l.dueDate);
            const diff = Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
            if (diff < 0) {
              isOverdue = true;
              overdueAmount += remaining;
              maxOverdueDays = Math.max(maxOverdueDays, Math.abs(diff));
            }
          }
        });
      }

      totalLent += owed;
      totalRecovered += paid;
      if (isOverdue) {
        totalOverdue += overdueAmount;
        overdueCount++;
        if (maxOverdueDays > 15) highRiskCount++;
      }

      return { name: b.name, owed, paid, remaining: owed - paid, isOverdue, overdueAmount, maxOverdueDays, tags: b.tags || [] };
    });

    const recoveryRate = totalLent > 0 ? (totalRecovered / totalLent) * 100 : 0;
    return { totalLent, totalRecovered, totalOverdue, overdueCount, highRiskCount, recoveryRate, borrowerStats };
  }

  // --- 1. Dashboard Summaries ---
  public getDashboardSummary(): string {
    const data = this.processData();
    if (data.totalLent === 0) return "Welcome to PayBack Pro! 👋 You don't have any active loans yet. Start by adding a borrower.";
    
    let summary = `You have a recovery rate of ${data.recoveryRate.toFixed(1)}%. `;
    
    if (data.overdueCount > 0) {
      summary += `Action needed: ${formatCurrency(data.totalOverdue)} is overdue from ${data.overdueCount} of your borrowers. ⚠️ `;
      if (data.highRiskCount > 0) {
        summary += `${data.highRiskCount} of them are considered high risk. Let's send some reminders today!`;
      } else {
        summary += `I suggest following up with them soon. 😊`;
      }
    } else {
      summary += `Great job! 🎉 Nobody is overdue today.`;
    }

    return summary;
  }

  // --- 2. Smart Reminder Generator ---
  public generateSmartReminder(borrower: RawBorrower): string {
    const data = this.processData().borrowerStats.find(b => b.name === borrower.name);
    if (!data || data.remaining <= 0) return "Hi {name}, your balance is fully settled. Thank you!";

    let tone = "friendly";
    if (data.isOverdue && data.maxOverdueDays > 14) tone = "urgent";
    else if (data.isOverdue) tone = "firm";
    
    if (data.tags.includes("FAMILY") || data.tags.includes("FRIEND")) {
      return `Hey {name}, just a quick friendly reminder about the outstanding ${formatCurrency(data.remaining)}. Let me know when you can settle it!`;
    }

    if (tone === "urgent") {
      return `URGENT: Hi {name}, your payment of ${formatCurrency(data.remaining)} is now ${data.maxOverdueDays} days overdue. Please process this payment immediately to avoid further action.`;
    } else if (tone === "firm") {
      return `Hi {name}, this is a reminder that your payment of ${formatCurrency(data.remaining)} is overdue. Please arrange payment at your earliest convenience.`;
    } else {
      return `Hi {name}, this is a gentle reminder regarding your upcoming payment of ${formatCurrency(data.remaining)}.`;
    }
  }

  // --- 3. Borrower Insights (Reliability Score) ---
  public getBorrowerInsight(borrower: RawBorrower): { text: string, score: number, label: "Excellent"|"Good"|"Warning"|"Danger" } {
    const data = this.processData().borrowerStats.find(b => b.name === borrower.name);
    if (!data) return { text: "Not enough data yet. 🤷‍♂️", score: 0, label: "Warning" };

    if (data.remaining <= 0) return { text: "This borrower has completely settled their debts. 🎉", score: 100, label: "Excellent" };
    
    if (data.isOverdue) {
      if (data.maxOverdueDays > 30) return { text: "Extremely high risk! ⚠️ Payments are heavily delayed.", score: 20, label: "Danger" };
      if (data.maxOverdueDays > 7) return { text: "High risk. Consistent delays in payment. 😬", score: 40, label: "Danger" };
      return { text: "Minor delays detected. Keep an eye on this. 👀", score: 60, label: "Warning" };
    }
    
    if (data.paid > 0) return { text: "Reliable payer! Payments are on time. ⭐️", score: 90, label: "Excellent" };
    return { text: "New active loan! Awaiting their first payment. 🤞", score: 80, label: "Good" };
  }

  // --- 4. NLP Query Engine ---
  public query(question: string): string {
    const q = question.toLowerCase();
    const data = this.processData();

    if (q.includes("who owes me") || q.includes("who owes")) {
      const owing = data.borrowerStats.filter(b => b.remaining > 0).sort((a,b) => b.remaining - a.remaining);
      if (owing.length === 0) return "Nobody owes you money right now! 🎉";
      const top = owing.slice(0, 3).map(b => `${b.name} (${formatCurrency(b.remaining)})`).join(", ");
      return `Currently, ${owing.length} people owe you money. The top borrowers are: ${top}. 💰`;
    }
    
    if (q.includes("overdue") || q.includes("late")) {
      if (data.overdueCount === 0) return "Great work! Nobody is overdue today. 😊";
      return `You have ${data.overdueCount} overdue loan(s) totaling ${formatCurrency(data.totalOverdue)}. ⚠️`;
    }

    if (q.includes("total") || q.includes("how much money") || q.includes("balance")) {
      return `Your total active loans are ${formatCurrency(data.totalLent)}. You have recovered ${formatCurrency(data.totalRecovered)} so far. 📈`;
    }

    if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
      return "Hi there! 👋 I'm your PayBack Pro AI Assistant. You can ask me things like 'Who owes me money?' or 'How much is overdue?'";
    }

    return "I'm sorry, I couldn't quite catch that. Try asking 'Who owes me?', 'What is my total balance?', or 'Who is overdue?'. 🤔";
  }

  // --- 5. Advanced Collection Intelligence ---
  public getCollectionIntelligence(borrower: RawBorrower): {
    paymentProbability: number;
    riskLevel: "Low" | "Medium" | "Critical";
    collectionScore: number;
    bestTimeToRemind: string;
    strategyNotes: string;
  } {
    const data = this.processData().borrowerStats.find(b => b.name === borrower.name);
    
    // Default / New Borrower
    if (!data || data.owed === 0) {
      return {
        paymentProbability: 80,
        riskLevel: "Low",
        collectionScore: 85,
        bestTimeToRemind: "Anytime",
        strategyNotes: "New account with no significant history. Monitor first payment."
      };
    }

    // Fully Settled
    if (data.remaining <= 0) {
      return {
        paymentProbability: 100,
        riskLevel: "Low",
        collectionScore: 100,
        bestTimeToRemind: "N/A",
        strategyNotes: "Account is fully settled. Excellent payment history."
      };
    }

    // Calculate base probability based on ratio of paid vs owed
    let probability = data.paid > 0 ? Math.round((data.paid / data.owed) * 100) : 50;
    
    // Penalize for overdue days
    if (data.isOverdue) {
      probability -= (data.maxOverdueDays * 1.5);
    }
    
    // Adjust based on tags
    if (data.tags.includes("HIGH_RISK") || data.tags.includes("DEFaulter")) probability -= 20;
    if (data.tags.includes("FAMILY") || data.tags.includes("FRIEND")) probability += 10;
    if (data.tags.includes("VIP")) probability += 15;

    // Bound probability between 5 and 95 (unless fully settled)
    probability = Math.max(5, Math.min(95, probability));

    // Determine Risk Level
    let riskLevel: "Low" | "Medium" | "Critical" = "Low";
    if (data.isOverdue && data.maxOverdueDays > 30) riskLevel = "Critical";
    else if (data.isOverdue && data.maxOverdueDays > 7) riskLevel = "Medium";
    else if (probability < 40) riskLevel = "Critical";
    else if (probability < 70) riskLevel = "Medium";

    // Collection Score (0-100 scale, inversely related to risk and overdue days)
    let score = Math.round(probability * 0.8 + (data.paid > 0 ? 20 : 0));
    if (data.isOverdue) score = Math.max(0, score - data.maxOverdueDays);
    score = Math.max(0, Math.min(100, score));

    // Best Time to Remind (Heuristic)
    let bestTime = "Friday Afternoon (2:00 PM)";
    if (data.tags.includes("BUSINESS")) bestTime = "Tuesday Morning (10:00 AM)";
    else if (riskLevel === "Critical") bestTime = "Immediately (Multiple Channels)";
    else if (data.tags.includes("FAMILY")) bestTime = "Weekend Evening";

    // AI Strategy Notes
    let strategy = "";
    if (riskLevel === "Critical") {
      strategy = "High risk of default. Escalate communication frequency. Consider a structured settlement offer or legal notice.";
    } else if (riskLevel === "Medium") {
      strategy = "Inconsistent payment pattern. Send firm reminders 3 days before the due date. Follow up via WhatsApp.";
    } else {
      strategy = "Reliable payer. Maintain standard automated reminders. No aggressive action needed.";
    }

    return {
      paymentProbability: Math.round(probability),
      riskLevel,
      collectionScore: score,
      bestTimeToRemind: bestTime,
      strategyNotes: strategy
    };
  }

  // --- 6. AI Business Copilot ---
  public getBusinessCopilotBriefing(): CopilotBriefing {
    const data = this.processData();
    let healthScore = 100;
    
    if (data.totalLent > 0) {
      const overdueRatio = data.totalOverdue / data.totalLent;
      healthScore -= (overdueRatio * 100);
      healthScore -= (data.highRiskCount * 5);
    }
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    const riskAlerts: string[] = [];
    const cashFlowRecommendations: string[] = [];

    if (data.highRiskCount > 0) {
      riskAlerts.push(`Watch out! ${data.highRiskCount} borrowers are severely overdue. ⚠️`);
    }
    
    const owingBorrowers = data.borrowerStats.filter(b => b.remaining > 0).sort((a,b) => b.remaining - a.remaining);
    if (owingBorrowers.length > 0) {
      const topOwe = owingBorrowers[0];
      if (topOwe.isOverdue) {
        cashFlowRecommendations.push(`You should remind ${topOwe.name} today to recover ${formatCurrency(topOwe.remaining)}. 🔔`);
      } else {
        cashFlowRecommendations.push(`Your biggest outstanding loan is ${formatCurrency(topOwe.remaining)} from ${topOwe.name}. Keep an eye on it! 👀`);
      }
    }
    
    if (data.overdueCount > 0) {
      riskAlerts.push(`You have ${formatCurrency(data.totalOverdue)} currently overdue across ${data.overdueCount} accounts. 📉`);
      cashFlowRecommendations.push(`Try sending automated reminders to your ${data.overdueCount} overdue accounts today. 📧`);
    } else if (data.totalLent > 0) {
      cashFlowRecommendations.push(`No accounts are overdue! 🎉 Take a break, or focus on growing your business.`);
    }

    if (data.totalLent === 0) {
      riskAlerts.push("No active loans found yet. 🏖️");
      cashFlowRecommendations.push("Start by onboarding your first borrower and issuing a loan! 🚀");
    }

    let dailyBriefing = `Hi! 👋 Today's Collection Health is ${healthScore}/100. `;
    if (data.totalLent === 0) {
      dailyBriefing += `You don't have any active loans yet. Need help? Ask me anything.`;
    } else if (healthScore >= 80) {
      dailyBriefing += `Here's how things look today: Everyone is paying on time with a ${data.recoveryRate.toFixed(1)}% recovery rate. Great work! 🎉`;
    } else if (healthScore >= 50) {
      dailyBriefing += `Things are mostly stable, but some late payments are piling up. Let's try sending a few reminders today. 😊`;
    } else {
      dailyBriefing += `We need to focus on collections today. Late payments are really affecting your cash flow! ⚠️`;
    }

    return {
      healthScore,
      dailyBriefing,
      riskAlerts,
      cashFlowRecommendations
    };
  }
}
