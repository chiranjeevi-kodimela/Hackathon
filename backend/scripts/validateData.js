import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getRiskRules } from "../src/services/riskEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(
  process.env.RISKLENS_DATA_DIR || path.join(__dirname, "..", "data"),
);
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
const accountStatusEvents = loadJSON(
  path.join(GENERATED_DIR, "account_status_events.json"),
);
const merchants = loadJSON(path.join(GENERATED_DIR, "merchants.json"));
const devices = loadJSON(path.join(GENERATED_DIR, "devices.json"));
const transactions = loadJSON(path.join(GENERATED_DIR, "transactions.json"));
const transfers = loadJSON(path.join(GENERATED_DIR, "transfers.json"));
const riskRules = loadJSON(path.join(GENERATED_DIR, "risk_rules.json"));
const alerts = loadJSON(path.join(GENERATED_DIR, "alerts.json"));
const alertRules = loadJSON(path.join(GENERATED_DIR, "alert_rules.json"));
const exceptions = loadJSON(path.join(GENERATED_DIR, "exceptions.json"));
const cases = loadJSON(path.join(GENERATED_DIR, "cases.json"));
const caseAlerts = loadJSON(path.join(GENERATED_DIR, "case_alerts.json"));
const analystActions = loadJSON(
  path.join(GENERATED_DIR, "analyst_actions.json"),
);
const auditEvents = loadJSON(path.join(GENERATED_DIR, "audit_events.json"));

const manifest = loadJSON(path.join(GENERATED_DIR, "manifest.json"));
const sourceManifest = loadJSON(
  path.join(GENERATED_DIR, "source_manifest.json"),
);
const groundTruth = loadJSON(path.join(GROUND_TRUTH_DIR, "ground_truth.json"));

// Build ID lookup sets
const customerIds = new Set(customers.map((item) => item.customerId));
const accountIds = new Set(accounts.map((item) => item.accountId));
const merchantIds = new Set(merchants.map((item) => item.merchantId));
const deviceIds = new Set(devices.map((item) => item.deviceId));
const transactionIds = new Set(transactions.map((item) => item.transactionId));
const alertIds = new Set(alerts.map((item) => item.alertId));
const caseIds = new Set(cases.map((item) => item.caseId));
const accountMap = new Map(accounts.map((item) => [item.accountId, item]));
const alertMap = new Map(alerts.map((item) => [item.alertId, item]));
const validRules = new Map(getRiskRules().map((rule) => [rule.ruleId, rule]));
const riskRuleIds = new Set(riskRules.map((item) => item.ruleId));

const transactionMap = new Map(
  transactions.map((item) => [item.transactionId, item]),
);
const accountStatusEventIds = new Set(
  accountStatusEvents.map((item) => item.eventId),
);

// 1. Primary key uniqueness
checkUnique(customers, "customerId", "Customers");
checkUnique(customers, "email", "Customers");
checkUnique(customers, "email", "Customers");
checkUnique(accounts, "accountId", "Accounts");
checkUnique(accountStatusEvents, "eventId", "Account status events");
checkUnique(merchants, "merchantId", "Merchants");
checkUnique(devices, "deviceId", "Devices");
checkUnique(transactions, "transactionId", "Transactions");
checkUnique(transfers, "transferId", "Transfers");
checkUnique(riskRules, "ruleId", "Risk rules");
checkUnique(alerts, "alertId", "Alerts");
checkUnique(exceptions, "exceptionId", "Exceptions");
checkUnique(cases, "caseId", "Cases");
checkUnique(analystActions, "actionId", "Analyst actions");
checkUnique(auditEvents, "eventId", "Audit events");

// 2. Foreign key integrity
checkReferences(accounts, "customerId", customerIds, "Accounts");
checkReferences(
  accountStatusEvents,
  "accountId",
  accountIds,
  "Account status events",
);
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
checkReferences(alertRules, "alertId", alertIds, "Alert-rule links");
checkReferences(alertRules, "ruleId", riskRuleIds, "Alert-rule links");
checkReferences(caseAlerts, "caseId", caseIds, "Case-alert links");
checkReferences(caseAlerts, "alertId", alertIds, "Case-alert links");
checkReferences(analystActions, "alertId", alertIds, "Analyst actions");
checkReferences(analystActions, "caseId", caseIds, "Analyst actions");

// 3. Transaction validation and balance reconciliation
let invalidAmounts = 0;
let invalidBalances = 0;
let invalidTypes = 0;
let invalidTimestamps = 0;
let invalidBalanceChains = 0;
let invalidTransactionFields = 0;
const lastBalanceByAccount = new Map(
  accounts.map((account) => [account.accountId, account.initialBalance]),
);

const orderedTransactions = [...transactions].sort(
  (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp),
);
const transactionsByAccount = new Map();
const firstUseByAccountDevice = new Set();
const seenAccountDevices = new Set();

for (const transaction of orderedTransactions) {
  if (!transactionsByAccount.has(transaction.accountId)) {
    transactionsByAccount.set(transaction.accountId, []);
  }
  transactionsByAccount.get(transaction.accountId).push(transaction);
  const accountDevice = `${transaction.accountId}|${transaction.deviceId}`;
  if (!seenAccountDevices.has(accountDevice)) {
    firstUseByAccountDevice.add(transaction.transactionId);
    seenAccountDevices.add(accountDevice);
  }
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
  if (
    !["CREDIT", "DEBIT", "TRANSFER_IN", "TRANSFER_OUT"].includes(
      transaction.type,
    ) ||
    !["COMPLETED", "PENDING", "FAILED"].includes(transaction.status) ||
    transaction.currency !== "INR"
  ) {
    invalidTransactionFields++;
  }

  const account = accountMap.get(transaction.accountId);
  if (
    account &&
    (account.status === "CLOSED" ||
      Date.parse(transaction.timestamp) < Date.parse(account.openedAt))
  ) {
    invalidBalanceChains++;
  }
  const previousBalance = lastBalanceByAccount.get(transaction.accountId);
  if (
    previousBalance !== undefined &&
    Math.abs(previousBalance - transaction.balanceBefore) > 0.01
  ) {
    invalidBalanceChains++;
  }
  lastBalanceByAccount.set(transaction.accountId, transaction.balanceAfter);
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
check(
  invalidBalanceChains === 0,
  `Transactions: per-account chronology and lifecycle reconcile (${invalidBalanceChains} invalid)`,
);
check(
  invalidTransactionFields === 0,
  `Transactions: valid types, statuses and currency (${invalidTransactionFields} invalid)`,
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
const invalidCustomerEnums = customers.filter(
  (customer) => !["VERIFIED", "PENDING"].includes(customer.kycStatus),
);
const invalidMerchantEnums = merchants.filter(
  (merchant) =>
    !["ACTIVE", "INACTIVE", "BLOCKED"].includes(merchant.status),
);
const invalidDevices = devices.filter(
  (device) =>
    typeof device.trusted !== "boolean" ||
    !["MOBILE", "DESKTOP", "TABLET"].includes(device.deviceType),
);
check(
  invalidCustomerEnums.length === 0,
  `Customers: valid KYC statuses (${invalidCustomerEnums.length} invalid)`,
);
check(
  invalidMerchantEnums.length === 0,
  `Merchants: valid statuses (${invalidMerchantEnums.length} invalid)`,
);
check(
  invalidDevices.length === 0,
  `Devices: valid types and trust flags (${invalidDevices.length} invalid)`,
);

// 5. Transfer reconciliation
let invalidTransfers = 0;
const transferLegIds = new Set();

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

  const duplicateLeg =
    transferLegIds.has(transfer.sourceTransactionId) ||
    transferLegIds.has(transfer.destinationTransactionId);
  transferLegIds.add(transfer.sourceTransactionId);
  transferLegIds.add(transfer.destinationTransactionId);

  if (!validTransfer || duplicateLeg) {
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
let invalidAlertFacts = 0;
let invalidAlertStatuses = 0;
const alertRuleKeys = new Set();
let invalidAlertRuleLinks = 0;
for (const link of alertRules) {
  const key = `${link.alertId}|${link.ruleId}`;
  if (alertRuleKeys.has(key)) invalidAlertRuleLinks++;
  alertRuleKeys.add(key);
  const rule = validRules.get(link.ruleId);
  if (!rule || link.points !== rule.points) invalidAlertRuleLinks++;
}

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
    continue;
  }

  const triggeredPoints = alert.triggeredRules.reduce((total, item) => {
    const rule = validRules.get(item.ruleId);
    const bridgeKey = `${alert.alertId}|${item.ruleId}`;
    if (
      !rule ||
      item.points !== rule.points ||
      !alertRuleKeys.has(bridgeKey)
    ) {
      invalidAlertFacts++;
      return total;
    }
    return total + rule.points;
  }, 0);
  const transaction = transactionMap.get(alert.transactionId);
  const expectedSeverity =
    alert.riskScore >= 75
      ? "CRITICAL"
      : alert.riskScore >= 50
        ? "HIGH"
        : alert.riskScore >= 25
          ? "MEDIUM"
          : "LOW";
  if (
    !transaction ||
    transaction.accountId !== alert.accountId ||
    alert.riskScore !== Math.min(triggeredPoints, 100) ||
    alert.severity !== expectedSeverity
  ) {
    invalidAlertFacts++;
  }
  if (!["OPEN", "ESCALATED", "DISMISSED", "RESOLVED"].includes(alert.status)) {
    invalidAlertStatuses++;
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
check(
  invalidAlertFacts === 0,
  `Alerts: rules, scores and triggering transaction agree (${invalidAlertFacts} invalid)`,
);
check(
  invalidAlertStatuses === 0,
  `Alerts: valid lifecycle statuses (${invalidAlertStatuses} invalid)`,
);
check(
  invalidAlertRuleLinks === 0,
  `Alert-rule links: unique foreign keys and matching points (${invalidAlertRuleLinks} invalid)`,
);

// 7. Ground-truth validation
const labels = Array.isArray(groundTruth.labels) ? groundTruth.labels : [];

const knownExceptions = Array.isArray(groundTruth.knownExceptions)
  ? groundTruth.knownExceptions
  : [];

const invalidLabels = labels.filter(
  (label) => {
    const alert = alertMap.get(label.alertId);
    const hasAdditionalIndicator = alert?.triggeredRules?.some(
      (rule) => rule.ruleId !== "R001",
    );
    const expectedLabel = hasAdditionalIndicator
      ? "SUSPICIOUS"
      : "FALSE_POSITIVE";
    return (
      !alert ||
      !transactionIds.has(label.transactionId) ||
      alert.transactionId !== label.transactionId ||
      label.expectedLabel !== expectedLabel ||
      label.expectedDecision !==
        (expectedLabel === "FALSE_POSITIVE"
          ? "DISMISS_ALERT"
          : ["HIGH", "CRITICAL"].includes(alert.severity)
            ? "ESCALATE_ALERT"
            : "INVESTIGATE")
    );
  },
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
check(
  sourceManifest.seed === manifest.seed &&
    sourceManifest.scale === manifest.scale &&
    sourceManifest.sourceType === "Synthetic only; generated internally" &&
    Array.isArray(sourceManifest.externalSources) &&
    sourceManifest.externalSources.length === 0,
  "Source manifest: synthetic provenance and generation settings match",
);

// 8. Case, disposition and audit lifecycle validation
const caseAlertKeys = new Set();
let invalidCaseLinks = 0;
for (const link of caseAlerts) {
  const key = `${link.caseId}|${link.alertId}`;
  if (caseAlertKeys.has(key)) invalidCaseLinks++;
  caseAlertKeys.add(key);
  const alert = alertMap.get(link.alertId);
  const riskCase = cases.find((item) => item.caseId === link.caseId);
  if (
    !alert ||
    !riskCase ||
    Date.parse(riskCase.createdAt) > Date.parse(alert.createdAt)
  ) {
    invalidCaseLinks++;
  }
}
const caseAlertCounts = new Map();
for (const link of caseAlerts) {
  caseAlertCounts.set(link.caseId, (caseAlertCounts.get(link.caseId) || 0) + 1);
}
const invalidCases = cases.filter(
  (riskCase) =>
    !["OPEN", "IN_REVIEW", "ESCALATED", "RESOLVED", "CLOSED"].includes(
      riskCase.status,
    ) ||
    !caseAlertCounts.has(riskCase.caseId) ||
    (riskCase.resolvedAt &&
      Date.parse(riskCase.resolvedAt) < Date.parse(riskCase.createdAt)),
);
const allowedActions = [
  "ESCALATE_ALERT",
  "DISMISS_ALERT",
  "RESOLVE_CASE",
  "REOPEN_CASE",
  "ADD_NOTE",
];
let invalidActions = 0;
for (const action of analystActions) {
  const alert = action.alertId ? alertMap.get(action.alertId) : null;
  if (
    !allowedActions.includes(action.actionType) ||
    (!action.alertId && !action.caseId) ||
    (action.alertId && !alert) ||
    (action.caseId && !caseIds.has(action.caseId)) ||
    (action.caseId &&
      action.alertId &&
      !caseAlertKeys.has(`${action.caseId}|${action.alertId}`)) ||
    (alert && Date.parse(action.createdAt) < Date.parse(alert.createdAt)) ||
    (action.actionType === "DISMISS_ALERT" && alert?.status !== "DISMISSED") ||
    (action.actionType === "ESCALATE_ALERT" && alert?.status !== "ESCALATED")
  ) {
    invalidActions++;
  }
}
const invalidAuditEvents = auditEvents.filter(
  (event) =>
    !["ALERT", "CASE"].includes(event.entityType) ||
    !(event.entityType === "ALERT"
      ? alertIds.has(event.entityId)
      : caseIds.has(event.entityId)) ||
    !event.eventType ||
    Number.isNaN(Date.parse(event.createdAt)),
);
check(
  invalidCaseLinks === 0,
  `Cases: valid, unique bridge rows and ordered dates (${invalidCaseLinks} invalid)`,
);
check(
  invalidCases.length === 0,
  `Cases: valid lifecycle and alert membership (${invalidCases.length} invalid)`,
);
check(
  invalidActions === 0,
  `Analyst actions: valid targets, transitions and dates (${invalidActions} invalid)`,
);
check(
  invalidAuditEvents.length === 0,
  `Audit events: valid entity references and timestamps (${invalidAuditEvents.length} invalid)`,
);
const expectedAlertRuleLinks = alerts.reduce(
  (count, alert) => count + (alert.triggeredRules?.length || 0),
  0,
);
check(
  alertRules.length === expectedAlertRuleLinks,
  `Alert-rule links: all and only triggered rules are materialized (${alertRules.length} rows)`,
);

const expectedExceptionChecks = exceptions.filter((item) => {
  if (item.issue_type === "TRANSACTION_ON_CLOSED_ACCOUNT") {
    return accountMap.get(item.accountId)?.status === "CLOSED";
  }
  if (item.issue_type === "NEGATIVE_BALANCE_WITHOUT_OVERDRAFT") {
    return (
      item.balanceBefore - item.transactionAmount === item.balanceAfter &&
      item.balanceAfter < 0
    );
  }
  if (item.issue_type === "TRANSFER_LEG_MISMATCH") {
    return item.sourceAmount !== item.destinationAmount;
  }
  if (item.issue_type === "ALERT_WITHOUT_TRANSACTION") {
    return !transactionIds.has(item.transactionId);
  }
  if (item.issue_type === "CASE_DISPOSITION_PRECEDES_ALERT") {
    return Date.parse(item.dispositionAt) < Date.parse(item.alertCreatedAt);
  }
  return false;
});
check(
  expectedExceptionChecks.length === expectedExceptionTypes.length,
  `Exceptions: all five labelled negative scenarios are reproducible (${expectedExceptionChecks.length} valid)`,
);

// 9. Manifest count validation and ground-truth evaluation metrics
const actualCounts = {
  customers: customers.length,
  accounts: accounts.length,
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

const labelPredictions = labels.map((label) => {
  const alert = alertMap.get(label.alertId);
  return alert
    ? {
    expected: label.expectedLabel === "SUSPICIOUS",
    predicted: alert.triggeredRules.some((rule) => rule.ruleId !== "R001"),
      }
    : { expected: label.expectedLabel === "SUSPICIOUS", predicted: false };
});
const truePositive = labelPredictions.filter(
  (item) => item.expected && item.predicted,
).length;
const falsePositive = labelPredictions.filter(
  (item) => !item.expected && item.predicted,
).length;
const trueNegative = labelPredictions.filter(
  (item) => !item.expected && !item.predicted,
).length;
const falseNegative = labelPredictions.filter(
  (item) => item.expected && !item.predicted,
).length;
const percentage = (numerator, denominator) =>
  denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;

// 10. Print validation report
const report = {
  project: "RiskLens",
  seed: manifest.seed,
  scale: manifest.scale,
  validatedAt: new Date().toISOString(),
  counts: actualCounts,
  evaluation: {
    labeledAlerts: labels.length,
    truePositive,
    falsePositive,
    trueNegative,
    falseNegative,
    precisionPercent: percentage(truePositive, truePositive + falsePositive),
    recallPercent: percentage(truePositive, truePositive + falseNegative),
    falsePositiveRatePercent: percentage(
      falsePositive,
      falsePositive + trueNegative,
    ),
  },
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
