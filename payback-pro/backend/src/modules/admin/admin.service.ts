import { prisma } from "../../prisma/client";
import { ApiError } from "../../utils/apiError";
import { hashPassword } from "../../utils/password";
import { Prisma } from "@prisma/client";

export async function getDashboardStats() {
  const [
    totalUsers,
    totalBorrowers,
    totalLoans,
    activeSessions,
    usersToday,
    emailsSent,
    remindersSent
  ] = await Promise.all([
    prisma.user.count(),
    prisma.borrower.count(),
    prisma.loan.count(),
    prisma.session.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.emailLog.count(),
    prisma.reminderHistory.count(),
  ]);

  const loans = await prisma.loan.findMany({ select: { principal: true, status: true } });
  const repayments = await prisma.repayment.findMany({ select: { amount: true } });

  const totalOutstandingAmount = loans.reduce((sum, loan) => sum + Number(loan.principal), 0);
  const totalRecoveredAmount = repayments.reduce((sum, rep) => sum + Number(rep.amount), 0);

  const recentLogins = await prisma.session.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: { select: { name: true, email: true } } }
  });

  const recentRegistrations = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, createdAt: true }
  });

  // Simplified chart data for demonstration
  const charts = {
    dailyLogins: [],
    monthlyRegistrations: [],
    activeUsers: [],
    loansCreated: [],
    paymentsReceived: []
  };

  return {
    totalUsers,
    totalBorrowers,
    totalLoans,
    activeSessions,
    usersToday,
    emailsSent,
    remindersSent,
    totalOutstandingAmount,
    totalRecoveredAmount,
    recentLogins,
    recentRegistrations,
    charts
  };
}

export async function getUsers() {
  return prisma.user.findMany({
    include: {
      _count: {
        select: { borrowers: true }
      },
      sessions: {
        where: { status: "ACTIVE" },
        orderBy: { lastActivityAt: 'desc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function updateUserStatus(userId: string, status: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { status }
  });
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash, resetToken: null, resetTokenExp: null }
  });
}

export async function deleteUser(userId: string) {
  return prisma.user.delete({ where: { id: userId } });
}

export async function getSessions() {
  return prisma.session.findMany({
    where: { status: "ACTIVE" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { lastActivityAt: 'desc' }
  });
}

export async function terminateSession(sessionId: string) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { status: "TERMINATED" }
  });
}

export async function getAnalytics() {
  const [emailLogs, reminderLogs, loanCount, repaymentCount] = await Promise.all([
    prisma.emailLog.findMany({ select: { status: true } }),
    prisma.reminderHistory.findMany({ select: { status: true } }),
    prisma.loan.count(),
    prisma.repayment.count()
  ]);

  const emailSuccess = emailLogs.filter(e => e.status === "SUCCESS").length;
  const emailFailed = emailLogs.filter(e => e.status === "FAILED").length;
  
  const reminderSuccess = reminderLogs.filter(r => r.status === "SUCCESS").length;
  const reminderFailed = reminderLogs.filter(r => r.status === "FAILED").length;

  return {
    emailSuccessRate: emailLogs.length ? (emailSuccess / emailLogs.length) * 100 : 0,
    reminderSuccessRate: reminderLogs.length ? (reminderSuccess / reminderLogs.length) * 100 : 0,
    emailFailed,
    reminderFailed,
    loanStatistics: { total: loanCount },
    recoveryStatistics: { totalRepayments: repaymentCount }
  };
}

export async function getGlobalSettings() {
  let settings = await prisma.globalSettings.findUnique({ where: { id: "global" } });
  if (!settings) {
    settings = await prisma.globalSettings.create({ data: { id: "global" } });
  }
  return settings;
}

export async function updateGlobalSettings(data: Prisma.GlobalSettingsUpdateInput) {
  return prisma.globalSettings.upsert({
    where: { id: "global" },
    update: data,
    create: { id: "global", ...data as any }
  });
}
