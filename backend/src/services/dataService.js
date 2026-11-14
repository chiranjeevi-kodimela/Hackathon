import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data/generated");

const datasets = [
  "customers",
  "accounts",
  "merchants",
  "devices",
  "transactions",
  "transfers",
  "alerts",
];

const cache = {};

for (const name of datasets) {
  const filePath = path.join(DATA_DIR, `${name}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Required dataset not found: ${filePath}`);
  }

  cache[name] = JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function getDataset(name) {
  if (!cache[name]) {
    throw new Error(`Unknown dataset: ${name}`);
  }

  return cache[name];
}

export function getDashboardMetrics() {
  const transactions = getDataset("transactions");
  const alerts = getDataset("alerts");
  const accounts = getDataset("accounts");

  const severityCounts = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  const alertStatusCounts = {};

  for (const alert of alerts) {
    severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;

    alertStatusCounts[alert.status] =
      (alertStatusCounts[alert.status] || 0) + 1;
  }

  const transactionTypeCounts = {
    CREDIT: 0,
    DEBIT: 0,
    TRANSFER_IN: 0,
    TRANSFER_OUT: 0,
  };

  let totalTransactionAmount = 0;

  for (const transaction of transactions) {
    transactionTypeCounts[transaction.type] =
      (transactionTypeCounts[transaction.type] || 0) + 1;

    totalTransactionAmount += transaction.amount;
  }

  const totalRiskScore = alerts.reduce(
    (total, alert) => total + alert.riskScore,
    0,
  );

  const averageRiskScore = alerts.length
    ? Number((totalRiskScore / alerts.length).toFixed(2))
    : 0;

  const highRiskAlerts = severityCounts.HIGH + severityCounts.CRITICAL;

  return {
    totals: {
      customers: getDataset("customers").length,
      accounts: accounts.length,
      transactions: transactions.length,
      alerts: alerts.length,
      transfers: getDataset("transfers").length,
    },
    risk: {
      highRiskAlerts,
      averageRiskScore,
      severityDistribution: severityCounts,
      alertStatusDistribution: alertStatusCounts,
    },
    transactions: {
      totalAmount: Number(totalTransactionAmount.toFixed(2)),
      typeDistribution: transactionTypeCounts,
    },
    accounts: {
      active: accounts.filter((account) => account.status === "ACTIVE").length,
      dormant: accounts.filter((account) => account.status === "DORMANT")
        .length,
      closed: accounts.filter((account) => account.status === "CLOSED").length,
    },
  };
}
