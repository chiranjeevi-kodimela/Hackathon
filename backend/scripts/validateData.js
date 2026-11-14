import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const GENERATED_DIR = path.join(DATA_DIR, "generated");
const GROUND_TRUTH_DIR = path.join(DATA_DIR, "ground_truth");

const errors = [];
const checks = [];

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing file: ${filePath}`);
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`Invalid JSON in ${filePath}: ${error.message}`);
    return [];
  }
}

function check(condition, message) {
  if (condition) {
    checks.push(message);
  } else {
    errors.push(message);
  }
}

function checkUnique(records, field, label) {
  const values = records.map((record) => record[field]);
  const uniqueValues = new Set(values);

  check(
    values.length === uniqueValues.size && !values.includes(undefined),
    `${label}: unique ${field} values`,
  );
}

function checkReferences(records, field, validIds, label) {
  const invalid = records.filter((record) => !validIds.has(record[field]));

  check(
    invalid.length === 0,
    `${label}: all ${field} references exist (${invalid.length} invalid)`,
  );
}

// Load generated datasets
const customers = loadJSON(path.join(GENERATED_DIR, "customers.json"));
const accounts = loadJSON(path.join(GENERATED_DIR, "accounts.json"));
const merchants = loadJSON(path.join(GENERATED_DIR, "merchants.json"));
const devices = loadJSON(path.join(GENERATED_DIR, "devices.json"));
const transactions = loadJSON(path.join(GENERATED_DIR, "transactions.json"));
const transfers = loadJSON(path.join(GENERATED_DIR, "transfers.json"));
const alerts = loadJSON(path.join(GENERATED_DIR, "alerts.json"));
const exceptions = loadJSON(path.join(GENERATED_DIR, "exceptions.json"));

const manifest = loadJSON(path.join(GENERATED_DIR, "manifest.json"));
const groundTruth = loadJSON(path.join(GROUND_TRUTH_DIR, "ground_truth.json"));

// Build ID lookup sets
const customerIds = new Set(customers.map((item) => item.customerId));
const accountIds = new Set(accounts.map((item) => item.accountId));
const merchantIds = new Set(merchants.map((item) => item.merchantId));
const deviceIds = new Set(devices.map((item) => item.deviceId));
const transactionIds = new Set(transactions.map((item) => item.transactionId));
const alertIds = new Set(alerts.map((item) => item.alertId));

const transactionMap = new Map(
  transactions.map((item) => [item.transactionId, item]),
);

// 1. Primary key uniqueness
checkUnique(customers, "customerId", "Customers");
checkUnique(accounts, "accountId", "Accounts");
checkUnique(merchants, "merchantId", "Merchants");
checkUnique(devices, "deviceId", "Devices");
checkUnique(transactions, "transactionId", "Transactions");
checkUnique(transfers, "transferId", "Transfers");
checkUnique(alerts, "alertId", "Alerts");
checkUnique(exceptions, "exceptionId", "Exceptions");

// 2. Foreign key integrity
checkReferences(accounts, "customerId", customerIds, "Accounts");
checkReferences(transactions, "accountId", accountIds, "Transactions");

const transactionsWithMerchant = transactions.filter(
  (item) => item.merchantId !== null && item.merchantId !== undefined,
);
const transactionsWithDevice = transactions.filter(
  (item) => item.deviceId !== null && item.deviceId !== undefined,
);

checkReferences(
  transactionsWithMerchant,
  "merchantId",
  merchantIds,
  "Transactions",
);

checkReferences(transactionsWithDevice, "deviceId", deviceIds, "Transactions");

checkReferences(alerts, "transactionId", transactionIds, "Alerts");
checkReferences(alerts, "accountId", accountIds, "Alerts");

// 3. Transaction validation and balance reconciliation
let invalidAmounts = 0;
let invalidBalances = 0;
let invalidTypes = 0;
let invalidTimestamps = 0;

for (const transaction of transactions) {
  if (
    typeof transaction.amount !== "number" ||
    !Number.isFinite(transaction.amount) ||
    transaction.amount <= 0
  ) {
    invalidAmounts++;
  }

  if (
    typeof transaction.balanceBefore !== "number" ||
    typeof transaction.balanceAfter !== "number"
  ) {
    invalidBalances++;
  } else {
    let expectedBalance;

    if (["CREDIT", "TRANSFER_IN"].includes(transaction.type)) {
      expectedBalance = transaction.balanceBefore + transaction.amount;
    } else if (["DEBIT", "TRANSFER_OUT"].includes(transaction.type)) {
      expectedBalance = transaction.balanceBefore - transaction.amount;
    } else {
      invalidTypes++;
      continue;
    }

    if (Math.abs(expectedBalance - transaction.balanceAfter) > 0.01) {
      invalidBalances++;
    }
  }

  if (Number.isNaN(Date.parse(transaction.timestamp))) {
    invalidTimestamps++;
  }
}

check(
  invalidAmounts === 0,
  `Transactions: positive valid amounts (${invalidAmounts} invalid)`,
);
check(
  invalidBalances === 0,
  `Transactions: balance arithmetic reconciles (${invalidBalances} invalid)`,
);
check(
  invalidTypes === 0,
  `Transactions: valid CREDIT, DEBIT, TRANSFER_IN and TRANSFER_OUT types (${invalidTypes} invalid)`,
);
check(
  invalidTimestamps === 0,
  `Transactions: valid timestamps (${invalidTimestamps} invalid)`,
);

// 4. Account validation
const invalidAccountBalances = accounts.filter(
  (account) =>
    typeof account.initialBalance !== "number" ||
    account.initialBalance < 0 ||
    typeof account.overdraftLimit !== "number" ||
    account.overdraftLimit < 0,
);

const invalidAccountStatuses = accounts.filter(
  (account) => !["ACTIVE", "DORMANT", "CLOSED"].includes(account.status),
);

check(
  invalidAccountBalances.length === 0,
  `Accounts: valid initial balances and overdraft limits (${invalidAccountBalances.length} invalid)`,
);

check(
  invalidAccountStatuses.length === 0,
  `Accounts: valid account statuses (${invalidAccountStatuses.length} invalid)`,
);

// 5. Transfer reconciliation
let invalidTransfers = 0;

for (const transfer of transfers) {
  const sourceTransaction = transactionMap.get(transfer.sourceTransactionId);
  const destinationTransaction = transactionMap.get(
    transfer.destinationTransactionId,
  );

  if (!sourceTransaction || !destinationTransaction) {
    invalidTransfers++;
    continue;
  }

  const validTransfer =
    sourceTransaction.accountId === transfer.sourceAccountId &&
    destinationTransaction.accountId === transfer.destinationAccountId &&
    sourceTransaction.type === "TRANSFER_OUT" &&
    destinationTransaction.type === "TRANSFER_IN" &&
    sourceTransaction.amount === transfer.amount &&
    destinationTransaction.amount === transfer.amount &&
    transfer.sourceAccountId !== transfer.destinationAccountId &&
    transfer.status === "RECONCILED";

  if (!validTransfer) {
    invalidTransfers++;
  }
}

check(
  invalidTransfers === 0,
  `Transfers: debit and credit legs reconcile (${invalidTransfers} invalid)`,
);

// 6. Alert validation
let invalidAlertScores = 0;
let invalidAlertRules = 0;

for (const alert of alerts) {
  if (
    typeof alert.riskScore !== "number" ||
    alert.riskScore < 0 ||
    alert.riskScore > 100
  ) {
    invalidAlertScores++;
  }

  if (
    !Array.isArray(alert.triggeredRules) ||
    alert.triggeredRules.length === 0
  ) {
    invalidAlertRules++;
  }
}

check(
  invalidAlertScores === 0,
  `Alerts: risk scores between 0 and 100 (${invalidAlertScores} invalid)`,
);

check(
  invalidAlertRules === 0,
  `Alerts: at least one triggered rule (${invalidAlertRules} invalid)`,
);

// 7. Ground-truth validation
const labels = Array.isArray(groundTruth.labels) ? groundTruth.labels : [];

const knownExceptions = Array.isArray(groundTruth.knownExceptions)
  ? groundTruth.knownExceptions
  : [];

const invalidLabels = labels.filter(
  (label) =>
    !alertIds.has(label.alertId) ||
    !transactionIds.has(label.transactionId) ||
    !["SUSPICIOUS", "FALSE_POSITIVE"].includes(label.expectedLabel),
);

const expectedExceptionTypes = [
  "TRANSACTION_ON_CLOSED_ACCOUNT",
  "NEGATIVE_BALANCE_WITHOUT_OVERDRAFT",
  "TRANSFER_LEG_MISMATCH",
  "ALERT_WITHOUT_TRANSACTION",
  "CASE_DISPOSITION_PRECEDES_ALERT",
];

const actualExceptionTypes = exceptions.map((item) => item.issue_type);

const missingExceptionTypes = expectedExceptionTypes.filter(
  (type) => !actualExceptionTypes.includes(type),
);

const invalidGroundTruthExceptions = expectedExceptionTypes.filter(
  (type) => !knownExceptions.some((item) => item.issue_type === type),
);

check(
  invalidLabels.length === 0,
  `Ground truth: labels reference existing alerts and transactions (${invalidLabels.length} invalid)`,
);

check(
  missingExceptionTypes.length === 0 &&
    invalidGroundTruthExceptions.length === 0,
  `Ground truth: all five known exception types are documented`,
);

check(
  groundTruth.seed === manifest.seed && groundTruth.scale === manifest.scale,
  "Ground truth: seed and scale match the generation manifest",
);

// 8. Manifest count validation
const actualCounts = {
  customers: customers.length,
  accounts: accounts.length,
  merchants: merchants.length,
  devices: devices.length,
  transactions: transactions.length,
  transfers: transfers.length,
  alerts: alerts.length,
  exceptions: exceptions.length,
};

let manifestCountErrors = 0;

for (const [key, actualCount] of Object.entries(actualCounts)) {
  if (manifest.counts?.[key] !== actualCount) {
    manifestCountErrors++;
  }
}

check(
  manifestCountErrors === 0,
  `Manifest: generated record counts match (${manifestCountErrors} mismatches)`,
);

// 9. Print validation report
const report = {
  project: "RiskLens",
  seed: manifest.seed,
  scale: manifest.scale,
  validatedAt: new Date().toISOString(),
  counts: actualCounts,
  checksPassed: checks.length,
  errorsFound: errors.length,
  status: errors.length === 0 ? "PASSED" : "FAILED",
  checks,
  errors,
};

console.log("\n===== RISKLENS DATA VALIDATION =====\n");
console.log(JSON.stringify(report, null, 2));

const reportDirectory = path.join(DATA_DIR, "validation");
fs.mkdirSync(reportDirectory, { recursive: true });

fs.writeFileSync(
  path.join(reportDirectory, "validation_report.json"),
  JSON.stringify(report, null, 2),
);

if (errors.length > 0) {
  console.error(
    "\nValidation failed. Fix the reported errors before continuing.",
  );
  process.exitCode = 1;
} else {
  console.log("\nAll data validation checks passed.");
}
