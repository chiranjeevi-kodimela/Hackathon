import prisma from "../config/prisma.js";

export async function getDashboardMetrics() {
  const [
    customerCount,
    accountCount,
    transactionCount,
    alertCount,
    transferCount,
    alertSeverityGroups,
    alertStatusGroups,
    transactionTypeGroups,
    transactionAmount,
    averageRisk,
    accountStatusGroups,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.account.count(),
    prisma.transaction.count(),
    prisma.alert.count(),
    prisma.transfer.count(),

    prisma.alert.groupBy({
      by: ["severity"],
      _count: { _all: true },
    }),

    prisma.alert.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),

    prisma.transaction.groupBy({
      by: ["type"],
      _count: { _all: true },
    }),

    prisma.transaction.aggregate({
      _sum: { amount: true },
    }),

    prisma.alert.aggregate({
      _avg: { riskScore: true },
    }),

    prisma.account.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const severityCounts = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  for (const group of alertSeverityGroups) {
    severityCounts[group.severity] = group._count._all;
  }

  const alertStatusCounts = {};

  for (const group of alertStatusGroups) {
    alertStatusCounts[group.status] = group._count._all;
  }

  const transactionTypeCounts = {
    CREDIT: 0,
    DEBIT: 0,
    TRANSFER_IN: 0,
    TRANSFER_OUT: 0,
  };

  for (const group of transactionTypeGroups) {
    transactionTypeCounts[group.type] = group._count._all;
  }

  const accountCounts = {
    ACTIVE: 0,
    DORMANT: 0,
    CLOSED: 0,
  };

  for (const group of accountStatusGroups) {
    accountCounts[group.status] = group._count._all;
  }

  const averageRiskScore = averageRisk._avg.riskScore ?? 0;

  return {
    totals: {
      customers: customerCount,
      accounts: accountCount,
      transactions: transactionCount,
      alerts: alertCount,
      transfers: transferCount,
    },
    risk: {
      highRiskAlerts: severityCounts.HIGH + severityCounts.CRITICAL,
      averageRiskScore: Number(averageRiskScore.toFixed(2)),
      severityDistribution: severityCounts,
      alertStatusDistribution: alertStatusCounts,
    },
    transactions: {
      totalAmount: Number((transactionAmount._sum.amount ?? 0).toString()),
      typeDistribution: transactionTypeCounts,
    },
    accounts: {
      active: accountCounts.ACTIVE,
      dormant: accountCounts.DORMANT,
      closed: accountCounts.CLOSED,
    },
  };
}
