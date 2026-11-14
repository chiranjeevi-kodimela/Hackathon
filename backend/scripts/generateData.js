import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateTransaction } from "../src/services/riskEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data");

const SEED = 20261022;

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

const scale = process.argv.includes("--scale=full") ? "full" : "starter";

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
const alerts = [];

const groundTruth = {
  seed: SEED,
  scale,
  labels: [],
  knownExceptions: [],
};

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

function addTransaction(account, amount, type) {
  const before = balances.get(account.accountId);

  const debit = ["DEBIT", "TRANSFER_OUT"].includes(type);

  if (debit && amount > before) {
    throw new Error("Insufficient balance in baseline transaction");
  }

  const after = debit ? before - amount : before + amount;

  balances.set(account.accountId, after);

  transactionCounter++;
  timeCursor += randInt(1, 15) * 60000;

  const transaction = {
    transactionId: `TXN-2026-${pad(transactionCounter, 8)}`,
    accountId: account.accountId,
    merchantId: pick(merchants).merchantId,
    deviceId: pick(devices).deviceId,
    type,
    amount,
    currency: "INR",
    balanceBefore: before,
    balanceAfter: after,
    status: "COMPLETED",
    timestamp: new Date(timeCursor).toISOString(),
  };

  transactions.push(transaction);

  return transaction;
}

const usableAccounts = accounts.filter((a) => a.status !== "CLOSED");
const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");

if (activeAccounts.length < 2) {
  throw new Error("At least two active accounts are required");
}

// 6. Generate alerts with explicit false-positive scenarios
for (let i = 1; i <= CONFIG.alerts; i++) {
  const isFalsePositive = i % 5 === 0;

  const account = isFalsePositive
    ? activeAccounts[i % activeAccounts.length]
    : usableAccounts[i % usableAccounts.length];

  const transaction = addTransaction(
    account,
    randInt(100000, 200000),
    "CREDIT",
  );

  // FALSE POSITIVE:
  // Only high transaction amount triggers the rule.
  // No velocity, new device, dormant account or circular transfer.
  //
  // SUSPICIOUS:
  // Additional risk indicators trigger alongside high amount.

  const context = {
    velocityCount10m: !isFalsePositive && i % 4 === 0 ? 7 : 0,

    isNewDevice: !isFalsePositive && i % 4 === 1,

    dormantDays: !isFalsePositive && account.status === "DORMANT" ? 120 : 0,

    circularTransfer: !isFalsePositive && i % 4 === 2,
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

  groundTruth.labels.push({
    alertId,
    transactionId: transaction.transactionId,
    expectedLabel: isFalsePositive ? "FALSE_POSITIVE" : "SUSPICIOUS",
    expectedDecision: isFalsePositive ? "CLOSE_FALSE_POSITIVE" : "INVESTIGATE",
    basis: isFalsePositive
      ? "High transaction amount alone is insufficient evidence of fraud"
      : "Additional risk indicators were triggered",
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

// 8. Negative scenarios kept outside valid baseline data
groundTruth.knownExceptions = [
  {
    issue_type: "TRANSACTION_ON_CLOSED_ACCOUNT",
    expectedOutcome: "REJECT_TRANSACTION",
  },
  {
    issue_type: "NEGATIVE_BALANCE_WITHOUT_OVERDRAFT",
    expectedOutcome: "FLAG_BALANCE_VIOLATION",
  },
  {
    issue_type: "TRANSFER_LEG_MISMATCH",
    expectedOutcome: "FLAG_RECONCILIATION_FAILURE",
  },
  {
    issue_type: "ALERT_WITHOUT_TRANSACTION",
    expectedOutcome: "FLAG_INVALID_ALERT",
  },
  {
    issue_type: "CASE_DISPOSITION_PRECEDES_ALERT",
    expectedOutcome: "REJECT_INVALID_LIFECYCLE",
  },
];

const exceptionRecords = [
  {
    exceptionId: "EXC-001",
    issue_type: "TRANSACTION_ON_CLOSED_ACCOUNT",
    accountId: accounts.find((a) => a.status === "CLOSED")?.accountId,
    expectedOutcome: "REJECT_TRANSACTION",
  },
  {
    exceptionId: "EXC-002",
    issue_type: "NEGATIVE_BALANCE_WITHOUT_OVERDRAFT",
    balanceBefore: 100,
    transactionAmount: 200,
    balanceAfter: -100,
    expectedOutcome: "FLAG_BALANCE_VIOLATION",
  },
  {
    exceptionId: "EXC-003",
    issue_type: "TRANSFER_LEG_MISMATCH",
    sourceAmount: 1000,
    destinationAmount: 900,
    expectedOutcome: "FLAG_RECONCILIATION_FAILURE",
  },
  {
    exceptionId: "EXC-004",
    issue_type: "ALERT_WITHOUT_TRANSACTION",
    transactionId: "TXN-2026-99999999",
    expectedOutcome: "FLAG_INVALID_ALERT",
  },
  {
    exceptionId: "EXC-005",
    issue_type: "CASE_DISPOSITION_PRECEDES_ALERT",
    dispositionAt: "2026-01-01T09:00:00.000Z",
    alertCreatedAt: "2026-01-01T10:00:00.000Z",
    expectedOutcome: "REJECT_INVALID_LIFECYCLE",
  },
];

// 9. Export
saveJSON("generated", "customers.json", customers);
saveJSON("generated", "accounts.json", accounts);
saveJSON("generated", "merchants.json", merchants);
saveJSON("generated", "devices.json", devices);
saveJSON("generated", "transactions.json", transactions);
saveJSON("generated", "transfers.json", transfers);
saveJSON("generated", "alerts.json", alerts);
saveJSON("generated", "exceptions.json", exceptionRecords);

saveJSON("ground_truth", "ground_truth.json", groundTruth);

// 10. Manifest
const manifest = {
  project: "RiskLens",
  seed: SEED,
  scale,
  source: "Internally generated synthetic data",
  counts: {
    customers: customers.length,
    accounts: accounts.length,
    merchants: merchants.length,
    devices: devices.length,
    transactions: transactions.length,
    transfers: transfers.length,
    alerts: alerts.length,
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
