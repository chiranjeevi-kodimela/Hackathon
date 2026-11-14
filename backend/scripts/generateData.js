import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateTransaction,
  getRiskRules,
} from "../src/services/riskEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(
  process.env.RISKLENS_DATA_DIR || path.join(__dirname, "../data"),
);

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);
const SEED = Number(args.get("seed") ?? process.env.RISKLENS_SEED ?? 20261022);

if (!Number.isInteger(SEED) || SEED < 1 || SEED > 0xffffffff) {
  throw new Error("Seed must be an integer between 1 and 4294967295");
}

function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(SEED);

const randInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;

const pick = (items) => items[randInt(0, items.length - 1)];

const pad = (number, length) => String(number).padStart(length, "0");

const scale = args.get("scale") ?? process.env.RISKLENS_SCALE ?? "starter";

if (!["starter", "full"].includes(scale)) {
  throw new Error('Scale must be either "starter" or "full"');
}

const CONFIG =
  scale === "full"
    ? {
        customers: 5000,
        accounts: 7000,
        merchants: 500,
        devices: 3000,
        transactions: 100000,
        alerts: 1000,
      }
    : {
        customers: 100,
        accounts: 140,
        merchants: 50,
        devices: 100,
        transactions: 1000,
        alerts: 10,
      };

const customers = [];
const accounts = [];
const merchants = [];
const devices = [];
const transactions = [];
const transfers = [];
const accountStatusEvents = [];
const alerts = [];
const cases = [];
const caseAlerts = [];
const analystActions = [];
const auditEvents = [];
const riskRules = getRiskRules().map((rule) => ({
  ...rule,
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}));

const groundTruth = {
  seed: SEED,
  scale,
  labels: [],
  knownExceptions: [],
};
const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function saveJSON(folder, filename, data) {
  const directory = path.join(DATA_DIR, folder);
  fs.mkdirSync(directory, { recursive: true });

  fs.writeFileSync(
    path.join(directory, filename),
    JSON.stringify(data, null, 2),
  );
}

// 1. Customers
for (let i = 1; i <= CONFIG.customers; i++) {
  customers.push({
    customerId: `CUS-${pad(i, 6)}`,
    firstName: pick(["Arun", "Kiran", "Ravi", "Priya", "Sneha"]),
    lastName: pick(["Kumar", "Reddy", "Sharma", "Rao"]),
    email: `customer${i}@example.test`,
    phone: `90000${pad(i, 5)}`,
    kycStatus: pick(["VERIFIED", "VERIFIED", "PENDING"]),
    createdAt: "2025-01-01T00:00:00.000Z",
  });
}

// 2. Accounts
// 2. Accounts
const balances = new Map();
const customerAccountCounts = new Map();

for (let i = 1; i <= CONFIG.accounts; i++) {
  const customerIndex = Math.min(
    CONFIG.customers - 1,
    Math.floor(((i - 1) * CONFIG.customers) / CONFIG.accounts),
  );

  const customerId = customers[customerIndex].customerId;

  // Assign a unique sequential account number to each customer.
  const accountNumber = (customerAccountCounts.get(customerId) || 0) + 1;
  customerAccountCounts.set(customerId, accountNumber);

  const accountId = `ACC-${customerId}-${pad(accountNumber, 2)}`;

  const status =
    random() < 0.02 ? "CLOSED" : random() < 0.08 ? "DORMANT" : "ACTIVE";
  const statusSince =
    status === "DORMANT" ? "2025-10-01T00:00:00.000Z" : "2024-01-01T00:00:00.000Z";

  const initialBalance = randInt(10000, 100000);

  accounts.push({
    accountId,
    customerId,
    accountType: pick(["SAVINGS", "CURRENT"]),
    status,
    currency: "INR",
    initialBalance,
    overdraftLimit: 0,
    openedAt: "2024-01-01T00:00:00.000Z",
    statusSince,
  });

  balances.set(accountId, initialBalance);
}

// 3. Merchants

// 3. Merchants
for (let i = 1; i <= CONFIG.merchants; i++) {
  merchants.push({
    merchantId: `MER-${pad(i, 5)}`,
    name: `Merchant ${i}`,
    category: pick([
      "GROCERY",
      "FOOD",
      "TRAVEL",
      "ELECTRONICS",
      "HEALTH",
      "RETAIL",
    ]),
    country: "IN",
    status: "ACTIVE",
  });
}

// 4. Devices
for (let i = 1; i <= CONFIG.devices; i++) {
  devices.push({
    deviceId: `DEV-${pad(i, 5)}`,
    deviceType: pick(["MOBILE", "DESKTOP", "TABLET"]),
    operatingSystem: pick(["ANDROID", "IOS", "WINDOWS"]),
    trusted: random() > 0.2,
  });
}

// 5. Transaction creation
let transactionCounter = 0;
let timeCursor = Date.UTC(2026, 0, 1);
const transactionsByAccount = new Map();
const accountDeviceUsage = new Map();
const transactionById = new Map();

function addTransaction(account, amount, type, minuteStep, deviceId) {
  const before = balances.get(account.accountId);

  const debit = ["DEBIT", "TRANSFER_OUT"].includes(type);

  if (debit && amount > before) {
    throw new Error("Insufficient balance in baseline transaction");
  }

  const after = debit ? before - amount : before + amount;

  balances.set(account.accountId, after);

  transactionCounter++;
  timeCursor += (minuteStep ?? randInt(1, 15)) * 60000;

  const transaction = {
    transactionId: `TXN-2026-${pad(transactionCounter, 8)}`,
    accountId: account.accountId,
    merchantId: pick(merchants).merchantId,
    deviceId: deviceId ?? pick(devices).deviceId,
    type,
    amount,
    currency: "INR",
    balanceBefore: before,
    balanceAfter: after,
    status: "COMPLETED",
    timestamp: new Date(timeCursor).toISOString(),
  };

  transactions.push(transaction);
  transactionById.set(transaction.transactionId, transaction);
  if (!transactionsByAccount.has(account.accountId)) {
    transactionsByAccount.set(account.accountId, []);
  }
  transactionsByAccount.get(account.accountId).push(transaction);
  if (!accountDeviceUsage.has(account.accountId)) {
    accountDeviceUsage.set(account.accountId, new Set());
  }
  accountDeviceUsage.get(account.accountId).add(transaction.deviceId);

  return transaction;
}

const usableAccounts = accounts.filter((a) => a.status !== "CLOSED");
const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");

if (activeAccounts.length < 2) {
  throw new Error("At least two active accounts are required");
}

function addTransfer(source, destination, amount, minuteStep = 1) {
  const debitTxn = addTransaction(
    source,
    amount,
    "TRANSFER_OUT",
    minuteStep,
  );
  const creditTxn = addTransaction(
    destination,
    amount,
    "TRANSFER_IN",
    minuteStep,
  );
  transfers.push({
    transferId: `TRF-${pad(transfers.length + 1, 7)}`,
    sourceAccountId: source.accountId,
    destinationAccountId: destination.accountId,
    sourceTransactionId: debitTxn.transactionId,
    destinationTransactionId: creditTxn.transactionId,
    amount,
    status: "RECONCILED",
  });
}

function createVelocityBurst(account) {
  for (let count = 0; count < 5; count++) {
    addTransaction(account, 100, "CREDIT", 1);
  }
}

function createCircularTransfer(account) {
  const availableAccounts = activeAccounts.filter(
    (candidate) => candidate.accountId !== account.accountId,
  );
  if (availableAccounts.length < 2) return false;

  const accountIndex = activeAccounts.indexOf(account);
  const first =
    availableAccounts[
      (accountIndex < 0 ? 0 : accountIndex) % availableAccounts.length
    ];
  const second = availableAccounts.find(
    (candidate) =>
      candidate.accountId !== first.accountId &&
      candidate.accountId !== account.accountId,
  );
  if (!second) return false;

  addTransfer(account, first, 500);
  addTransfer(first, second, 500);
  addTransfer(second, account, 500);
  return true;
}

function hasRecentCircularTransfer(accountId, timestamp) {
  const end = Date.parse(timestamp);
  const start = end - 10 * 60_000;
  const adjacency = new Map();

  for (const transfer of transfers) {
    const source = transactionById.get(transfer.sourceTransactionId);
    const destination = transactionById.get(transfer.destinationTransactionId);
    if (
      !source ||
      !destination ||
      Date.parse(source.timestamp) < start ||
      Date.parse(destination.timestamp) > end
    ) {
      continue;
    }

    if (!adjacency.has(transfer.sourceAccountId)) {
      adjacency.set(transfer.sourceAccountId, []);
    }
    adjacency.get(transfer.sourceAccountId).push(transfer.destinationAccountId);
  }

  function closesCycle(current, visited, edgeCount) {
    for (const destination of adjacency.get(current) || []) {
      if (destination === accountId && edgeCount >= 2) return true;
      if (!visited.has(destination)) {
        const nextVisited = new Set(visited);
        nextVisited.add(destination);
        if (closesCycle(destination, nextVisited, edgeCount + 1)) return true;
      }
    }
    return false;
  }

  return closesCycle(accountId, new Set([accountId]), 0);
}

// 6. Generate alerts with explicit false-positive scenarios
for (let i = 1; i <= CONFIG.alerts; i++) {
  const isFalsePositive = i % 5 === 0;

  const account = isFalsePositive
    ? activeAccounts[i % activeAccounts.length]
    : usableAccounts[i % usableAccounts.length];

  const pattern = i % 4;
  const velocityPattern = !isFalsePositive && pattern === 0;
  const circularPattern =
    !isFalsePositive &&
    (pattern === 2 || (pattern === 3 && account.status !== "DORMANT"));
  if (velocityPattern) createVelocityBurst(account);
  if (circularPattern && activeAccounts.length >= 3) {
    createCircularTransfer(account);
  }

  const device =
    !isFalsePositive && pattern === 1
      ? devices.find(
          (item) => !accountDeviceUsage.get(account.accountId)?.has(item.deviceId),
        )
      : undefined;
  const isNewDevice =
    device !== undefined &&
    !accountDeviceUsage.get(account.accountId)?.has(device.deviceId);
  const transaction = addTransaction(
    account,
    randInt(100000, 200000),
    "CREDIT",
    velocityPattern || circularPattern ? 1 : undefined,
    device?.deviceId,
  );
  const accountTransactions = transactionsByAccount.get(account.accountId);
  const velocityCount10m = accountTransactions.filter(
    (item) =>
      Date.parse(item.timestamp) <= Date.parse(transaction.timestamp) &&
      Date.parse(item.timestamp) >= Date.parse(transaction.timestamp) - 10 * 60_000,
  ).length;
  const dormantDays =
    account.status === "DORMANT"
      ? Math.floor(
          (Date.parse(transaction.timestamp) - Date.parse(account.statusSince)) /
            86_400_000,
        )
      : 0;
  const context = {
    velocityCount10m,
    isNewDevice,
    dormantDays,
    circularTransfer: hasRecentCircularTransfer(
      account.accountId,
      transaction.timestamp,
    ),
  };

  const result = evaluateTransaction(
    {
      amount: transaction.amount,
      accountStatus: account.status,
      balanceAfter: transaction.balanceAfter,
      overdraftLimit: account.overdraftLimit,
    },
    context,
  );

  if (dormantDays >= 90) {
    accountStatusEvents.push({
      eventId: `ASE-2026-${pad(accountStatusEvents.length + 1, 6)}`,
      accountId: account.accountId,
      previousStatus: account.status,
      newStatus: "ACTIVE",
      reason: "DORMANT_REACTIVATION",
      previousStatusSince: account.statusSince,
      effectiveAt: transaction.timestamp,
    });
    account.status = "ACTIVE";
    account.statusSince = transaction.timestamp;
    if (!activeAccounts.some((item) => item.accountId === account.accountId)) {
      activeAccounts.push(account);
    }
  }

  const alertId = `ALT-2026-${pad(i, 6)}`;

  alerts.push({
    alertId,
    transactionId: transaction.transactionId,
    accountId: account.accountId,
    riskScore: result.riskScore,
    severity: result.severity,
    status: "OPEN",
    triggeredRules: result.triggeredRules,
    createdAt: transaction.timestamp,
  });

  const hasAdditionalIndicator = result.triggeredRules.some(
    (rule) => rule.ruleId !== "R001",
  );
  const expectedLabel = hasAdditionalIndicator ? "SUSPICIOUS" : "FALSE_POSITIVE";
  const expectedDecision =
    expectedLabel === "FALSE_POSITIVE"
      ? "DISMISS_ALERT"
      : severityRank[result.severity] >= 3
        ? "ESCALATE_ALERT"
        : "INVESTIGATE";

  groundTruth.labels.push({
    alertId,
    transactionId: transaction.transactionId,
    expectedLabel,
    expectedDecision,
    basis:
      expectedLabel === "FALSE_POSITIVE"
        ? "High transaction amount alone is insufficient evidence of fraud"
        : `Additional indicators triggered: ${result.triggeredRules
            .filter((rule) => rule.ruleId !== "R001")
            .map((rule) => rule.ruleId)
            .join(", ")}`,
  });
}

// 7. Normal transactions and reconciled transfers
let normalCounter = 0;

while (transactions.length < CONFIG.transactions) {
  const shouldTransfer =
    normalCounter % 10 === 0 && transactions.length + 2 <= CONFIG.transactions;

  if (shouldTransfer) {
    const source = pick(activeAccounts);
    let destination = pick(activeAccounts);

    while (destination.accountId === source.accountId) {
      destination = pick(activeAccounts);
    }

    const sourceBalance = balances.get(source.accountId);
    const amount = randInt(100, Math.min(5000, sourceBalance));

    const debitTxn = addTransaction(source, amount, "TRANSFER_OUT");
    const creditTxn = addTransaction(destination, amount, "TRANSFER_IN");

    transfers.push({
      transferId: `TRF-${pad(transfers.length + 1, 7)}`,
      sourceAccountId: source.accountId,
      destinationAccountId: destination.accountId,
      sourceTransactionId: debitTxn.transactionId,
      destinationTransactionId: creditTxn.transactionId,
      amount,
      status: "RECONCILED",
    });
  } else {
    const account = pick(usableAccounts);
    let amount = randInt(100, 25000);

    let type = random() > 0.5 ? "DEBIT" : "CREDIT";

    if (type === "DEBIT" && amount > balances.get(account.accountId)) {
      type = "CREDIT";
    }

    addTransaction(account, amount, type);
  }

  normalCounter++;
}

// Group alerts by account so the cases and bridge rows use the same stable IDs.
const alertGroups = new Map();
for (const alert of alerts) {
  if (!alertGroups.has(alert.accountId)) alertGroups.set(alert.accountId, []);
  alertGroups.get(alert.accountId).push(alert);
}

const groups = [...alertGroups.entries()].sort(([left], [right]) =>
  left.localeCompare(right),
);

for (const [index, [accountId, items]] of groups.entries()) {
  const caseId = `CASE-2026-${pad(index + 1, 6)}`;
  const highestAlert = items.reduce((highest, alert) =>
    severityRank[alert.severity] > severityRank[highest.severity]
      ? alert
      : highest,
  );
  const labelByAlertId = new Map(
    groundTruth.labels.map((label) => [label.alertId, label]),
  );
  const actionableAlerts = items.filter((alert) => {
    const label = labelByAlertId.get(alert.alertId);
    return (
      label.expectedLabel === "FALSE_POSITIVE" ||
      severityRank[alert.severity] >= severityRank.HIGH
    );
  });
  const allDismissed =
    actionableAlerts.length === items.length &&
    actionableAlerts.every(
      (alert) =>
        labelByAlertId.get(alert.alertId).expectedLabel === "FALSE_POSITIVE",
    );
  const latestActionAt =
    actionableAlerts.length > 0
    ? new Date(
        Math.max(...actionableAlerts.map((alert) => Date.parse(alert.createdAt))) +
          60_000,
      ).toISOString()
    : items[0].createdAt;
  const resolvedAt = allDismissed ? latestActionAt : null;

  cases.push({
    caseId,
    title: `Risk investigation - ${accountId}`,
    description: `${items.length} alert(s) associated with account ${accountId}`,
    status: allDismissed
      ? "RESOLVED"
      : actionableAlerts.length > 0
        ? "IN_REVIEW"
        : "OPEN",
    priority: highestAlert.severity,
    assignedTo: "ANL-0001",
    createdAt: items[0].createdAt,
    updatedAt: latestActionAt,
    resolvedAt,
  });

  for (const alert of items) {
    caseAlerts.push({ caseId, alertId: alert.alertId });
    const label = labelByAlertId.get(alert.alertId);
    const actionType =
      label.expectedLabel === "FALSE_POSITIVE"
        ? "DISMISS_ALERT"
        : severityRank[alert.severity] >= severityRank.HIGH
          ? "ESCALATE_ALERT"
          : null;

    if (!actionType) continue;

    const actionId = `ACT-2026-${pad(analystActions.length + 1, 6)}`;
    const timestamp = new Date(Date.parse(alert.createdAt) + 60_000).toISOString();
    const notes =
      actionType === "DISMISS_ALERT"
        ? "Synthetic review: high amount without corroborating indicators"
        : "Synthetic review: elevated rule-based risk requires escalation";

    alert.status = actionType === "DISMISS_ALERT" ? "DISMISSED" : "ESCALATED";
    analystActions.push({
      actionId,
      alertId: alert.alertId,
      caseId,
      caseAlertCaseId: caseId,
      caseAlertAlertId: alert.alertId,
      analystId: "ANL-0001",
      actionType,
      notes,
      createdAt: timestamp,
    });
    auditEvents.push({
      eventId: `AUD-2026-${pad(auditEvents.length + 1, 6)}`,
      entityType: "ALERT",
      entityId: alert.alertId,
      eventType: actionType,
      actorId: "ANL-0001",
      details: { actionId, caseId, notes },
      createdAt: timestamp,
    });
  }
}

// 8. Add complete, labelled edge-case records in a separate fixture collection.
const closedAccount = accounts.find((account) => account.status === "CLOSED");
if (!closedAccount || activeAccounts.length < 2) {
  throw new Error("Exception fixtures require a closed account and two active accounts");
}

const exceptionTimestamp = new Date(timeCursor + 60_000).toISOString();
const closedAccountTransaction = {
  transactionId: "TXN-2026-90000001",
  accountId: closedAccount.accountId,
  merchantId: merchants[0].merchantId,
  deviceId: devices[0].deviceId,
  type: "DEBIT",
  amount: 100,
  currency: "INR",
  balanceBefore: 1000,
  balanceAfter: 1000,
  status: "FAILED",
  timestamp: exceptionTimestamp,
};

const negativeBalanceAccount = activeAccounts[0];
const negativeBalanceTransaction = {
  transactionId: "TXN-2026-90000002",
  accountId: negativeBalanceAccount.accountId,
  merchantId: merchants[0].merchantId,
  deviceId: devices[0].deviceId,
  type: "DEBIT",
  amount: 200,
  currency: "INR",
  balanceBefore: 100,
  balanceAfter: -100,
  status: "COMPLETED",
  timestamp: new Date(timeCursor + 120_000).toISOString(),
};

const transferSource = activeAccounts[0];
const transferDestination = activeAccounts[1];
const mismatchSourceTransaction = {
  transactionId: "TXN-2026-90000003",
  accountId: transferSource.accountId,
  merchantId: merchants[0].merchantId,
  deviceId: devices[0].deviceId,
  type: "TRANSFER_OUT",
  amount: 1000,
  currency: "INR",
  balanceBefore: 10_000,
  balanceAfter: 9_000,
  status: "COMPLETED",
  timestamp: new Date(timeCursor + 180_000).toISOString(),
};
const mismatchDestinationTransaction = {
  transactionId: "TXN-2026-90000004",
  accountId: transferDestination.accountId,
  merchantId: merchants[0].merchantId,
  deviceId: devices[0].deviceId,
  type: "TRANSFER_IN",
  amount: 900,
  currency: "INR",
  balanceBefore: 10_000,
  balanceAfter: 10_900,
  status: "COMPLETED",
  timestamp: new Date(timeCursor + 240_000).toISOString(),
};

const orphanAlertAccount = activeAccounts[1];
const orphanAlert = {
  alertId: "ALT-2026-900001",
  transactionId: "TXN-2026-99999999",
  accountId: orphanAlertAccount.accountId,
  riskScore: 20,
  severity: "LOW",
  status: "OPEN",
  triggeredRules: [
    {
      ruleId: "R001",
      ruleName: "High Transaction Amount",
      points: 20,
      reason: "Transaction amount exceeds INR 100,000",
    },
  ],
  createdAt: new Date(timeCursor + 300_000).toISOString(),
};

const dispositionSourceAlert = alerts[0];
const dispositionAlertCreatedAt = new Date(
  Date.parse(dispositionSourceAlert.createdAt) + 180_000,
).toISOString();
const dispositionCaseCreatedAt = new Date(
  Date.parse(dispositionSourceAlert.createdAt) + 60_000,
).toISOString();
const earlyDispositionAt = new Date(
  Date.parse(dispositionSourceAlert.createdAt) + 120_000,
).toISOString();
const dispositionAlert = {
  ...dispositionSourceAlert,
  alertId: "ALT-2026-900002",
  status: "DISMISSED",
  createdAt: dispositionAlertCreatedAt,
};
const dispositionCase = {
  caseId: "CASE-2026-900001",
  title: "Lifecycle exception fixture",
  description: "Analyst disposition precedes this alert",
  status: "OPEN",
  priority: dispositionAlert.severity,
  assignedTo: "ANL-0001",
  createdAt: dispositionCaseCreatedAt,
  updatedAt: earlyDispositionAt,
  resolvedAt: null,
};
const earlyDispositionAction = {
  actionId: "ACT-2026-900001",
  alertId: dispositionAlert.alertId,
  caseId: dispositionCase.caseId,
  caseAlertCaseId: dispositionCase.caseId,
  caseAlertAlertId: dispositionAlert.alertId,
  analystId: "ANL-0001",
  actionType: "DISMISS_ALERT",
  notes: "Deliberately invalid fixture: disposition predates alert",
  createdAt: earlyDispositionAt,
};

const exceptionRecords = [
  {
    exceptionId: "EXC-001",
    issue_type: "TRANSACTION_ON_CLOSED_ACCOUNT",
    expectedDecision: "REJECT_TRANSACTION",
    expectedOutcome: "REJECT_TRANSACTION",
    recordIds: { transactionId: closedAccountTransaction.transactionId },
    records: { transaction: closedAccountTransaction },
  },
  {
    exceptionId: "EXC-002",
    issue_type: "NEGATIVE_BALANCE_WITHOUT_OVERDRAFT",
    expectedDecision: "FLAG_BALANCE_VIOLATION",
    expectedOutcome: "FLAG_BALANCE_VIOLATION",
    recordIds: { transactionId: negativeBalanceTransaction.transactionId },
    records: { transaction: negativeBalanceTransaction },
  },
  {
    exceptionId: "EXC-003",
    issue_type: "TRANSFER_LEG_MISMATCH",
    expectedDecision: "FLAG_RECONCILIATION_FAILURE",
    expectedOutcome: "FLAG_RECONCILIATION_FAILURE",
    recordIds: {
      transferId: "TRF-9000001",
      sourceTransactionId: mismatchSourceTransaction.transactionId,
      destinationTransactionId: mismatchDestinationTransaction.transactionId,
    },
    records: {
      transfer: {
        transferId: "TRF-9000001",
        sourceAccountId: transferSource.accountId,
        destinationAccountId: transferDestination.accountId,
        sourceTransactionId: mismatchSourceTransaction.transactionId,
        destinationTransactionId: mismatchDestinationTransaction.transactionId,
        amount: 1000,
        status: "MISMATCHED",
      },
      sourceTransaction: mismatchSourceTransaction,
      destinationTransaction: mismatchDestinationTransaction,
    },
  },
  {
    exceptionId: "EXC-004",
    issue_type: "ALERT_WITHOUT_TRANSACTION",
    expectedDecision: "REJECT_ALERT",
    expectedOutcome: "FLAG_INVALID_ALERT",
    recordIds: { alertId: orphanAlert.alertId },
    records: { alert: orphanAlert },
  },
  {
    exceptionId: "EXC-005",
    issue_type: "CASE_DISPOSITION_PRECEDES_ALERT",
    expectedDecision: "REJECT_INVALID_LIFECYCLE",
    expectedOutcome: "REJECT_INVALID_LIFECYCLE",
    recordIds: {
      caseId: dispositionCase.caseId,
      alertId: dispositionAlert.alertId,
      actionId: earlyDispositionAction.actionId,
    },
    records: {
      riskCase: dispositionCase,
      alert: dispositionAlert,
      caseAlert: {
        caseId: dispositionCase.caseId,
        alertId: dispositionAlert.alertId,
      },
      analystAction: earlyDispositionAction,
    },
  },
];

groundTruth.knownExceptions = exceptionRecords.map((exception) => ({
  exceptionId: exception.exceptionId,
  issue_type: exception.issue_type,
  expectedDecision: exception.expectedDecision,
  expectedOutcome: exception.expectedOutcome,
  recordIds: exception.recordIds,
}));

// 9. Export
saveJSON("generated", "customers.json", customers);
saveJSON("generated", "accounts.json", accounts);
saveJSON("generated", "account_status_events.json", accountStatusEvents);
saveJSON("generated", "merchants.json", merchants);
saveJSON("generated", "devices.json", devices);
saveJSON("generated", "transactions.json", transactions);
saveJSON("generated", "transfers.json", transfers);
saveJSON("generated", "alerts.json", alerts);
saveJSON("generated", "cases.json", cases);
saveJSON("generated", "case_alerts.json", caseAlerts);
saveJSON("generated", "analyst_actions.json", analystActions);
saveJSON("generated", "audit_events.json", auditEvents);
saveJSON("generated", "exceptions.json", exceptionRecords);

saveJSON("ground_truth", "ground_truth.json", groundTruth);
const groundTruthRows = [
  ...groundTruth.labels.map((label) => ({
    record_type: "ALERT_LABEL",
    issue_type: "",
    alertId: label.alertId,
    transactionId: label.transactionId,
    expectedLabel: label.expectedLabel,
    expectedDecision: label.expectedDecision,
    expectedOutcome: "",
    basis: label.basis,
  })),
  ...exceptionRecords.map((exception) => ({
    record_type: "KNOWN_EXCEPTION",
    issue_type: exception.issue_type,
    exceptionId: exception.exceptionId,
    entityIds: exception.recordIds,
    alertId: "",
    transactionId: exception.recordIds.transactionId ?? "",
    expectedLabel: "",
    expectedDecision: exception.expectedDecision,
    expectedOutcome: exception.expectedOutcome,
    basis: "",
  })),
];
const groundTruthFields = [
  "record_type",
  "issue_type",
  "exceptionId",
  "entityIds",
  "alertId",
  "transactionId",
  "expectedLabel",
  "expectedDecision",
  "expectedOutcome",
  "basis",
];
const groundTruthCsv = [
  groundTruthFields.map(csvValue).join(","),
  ...groundTruthRows.map((row) =>
    groundTruthFields.map((field) => csvValue(row[field])).join(","),
  ),
].join("\n");
fs.writeFileSync(
  path.join(DATA_DIR, "ground_truth", "ground_truth.csv"),
  `${groundTruthCsv}\n`,
);

// 10. Export CSV and SQL alongside the canonical JSON records.
const alertRules = alerts.flatMap((alert) =>
  alert.triggeredRules.map((rule) => ({
    alertId: alert.alertId,
    ruleId: rule.ruleId,
    points: rule.points,
    reason: rule.reason,
  })),
);
saveJSON("generated", "risk_rules.json", riskRules);
saveJSON("generated", "alert_rules.json", alertRules);

const exportTables = {
  customers: ["customers", customers],
  accounts: ["accounts", accounts],
  account_status_events: ["account_status_events", accountStatusEvents],
  merchants: ["merchants", merchants],
  devices: ["devices", devices],
  transactions: ["transactions", transactions],
  transfers: ["transfers", transfers],
  risk_rules: ["risk_rules", riskRules],
  alerts: ["alerts", alerts],
  alert_rules: ["alert_rules", alertRules],
  cases: ["risk_cases", cases],
  case_alerts: ["case_alerts", caseAlerts],
  analyst_actions: ["analyst_actions", analystActions],
  audit_events: ["audit_events", auditEvents],
};
const sourceManifest = {
  project: "RiskLens",
  seed: SEED,
  scale,
  generator: "backend/scripts/generateData.js",
  sourceType: "Synthetic only; generated internally",
  externalSources: [],
  groundTruthPath: "../ground_truth/ground_truth.json",
  exceptionPath: "exceptions.json",
};
saveJSON("generated", "source_manifest.json", sourceManifest);

function csvValue(value) {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `'${text.replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

let sql = "SET FOREIGN_KEY_CHECKS = 0;\n";
for (const [name, [table, records]] of Object.entries(exportTables)) {
  const fields = [...new Set(records.flatMap((record) => Object.keys(record)))];
  if (records.length) {
    const csv = [
      fields.map(csvValue).join(","),
      ...records.map((record) =>
        fields.map((field) => csvValue(record[field])).join(","),
      ),
    ].join("\n");
    fs.writeFileSync(path.join(DATA_DIR, "generated", `${name}.csv`), `${csv}\n`);

    const columns = fields.map((field) => `\`${field}\``).join(", ");
    for (let offset = 0; offset < records.length; offset += 500) {
      const values = records
        .slice(offset, offset + 500)
        .map(
          (record) =>
            `(${fields.map((field) => sqlValue(record[field])).join(", ")})`,
        )
        .join(",\n");
      sql += `INSERT INTO \`${table}\` (${columns}) VALUES\n${values};\n`;
    }
  }
}
const exceptionCsvFields = [
  "exceptionId",
  "issue_type",
  "expectedDecision",
  "expectedOutcome",
  "recordIds",
  "records",
];
fs.writeFileSync(
  path.join(DATA_DIR, "generated", "exceptions.csv"),
  [
    exceptionCsvFields.map(csvValue).join(","),
    ...exceptionRecords.map((record) =>
      exceptionCsvFields.map((field) => csvValue(record[field])).join(","),
    ),
  ].join("\n") + "\n",
);
sql += "SET FOREIGN_KEY_CHECKS = 1;\n";
fs.writeFileSync(path.join(DATA_DIR, "generated", "seed.sql"), sql);

// 11. Manifest
const manifest = {
  project: "RiskLens",
  seed: SEED,
  scale,
  source: "Internally generated synthetic data",
  sourceManifestFile: "source_manifest.json",
  counts: {
    customers: customers.length,
    accounts: accounts.length,
    accountStatusEvents: accountStatusEvents.length,
    merchants: merchants.length,
    devices: devices.length,
    transactions: transactions.length,
    transfers: transfers.length,
    riskRules: riskRules.length,
    alerts: alerts.length,
    alertRules: alertRules.length,
    cases: cases.length,
    caseAlerts: caseAlerts.length,
    analystActions: analystActions.length,
    auditEvents: auditEvents.length,
    exceptions: exceptionRecords.length,
    falsePositives: groundTruth.labels.filter(
      (x) => x.expectedLabel === "FALSE_POSITIVE",
    ).length,
  },
};

saveJSON("generated", "manifest.json", manifest);

console.log("\n===== RISKLENS DATA GENERATION =====");
console.log(JSON.stringify(manifest, null, 2));
console.log("\nGeneration completed successfully.");
