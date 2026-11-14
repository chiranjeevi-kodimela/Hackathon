const RISK_RULES = [
  {
    id: "R001",
    name: "High Transaction Amount",
    points: 20,
    check: (txn) => txn.amount >= 100000,
    reason: "Transaction amount exceeds ₹1,00,000",
  },
  {
    id: "R002",
    name: "High Transaction Velocity",
    points: 25,
    check: (txn, context) => context.velocityCount10m >= 5,
    reason: "Five or more transactions within 10 minutes",
  },
  {
    id: "R003",
    name: "New Device Activity",
    points: 20,
    check: (txn, context) => context.isNewDevice === true,
    reason: "Transaction initiated from a new device",
  },
  {
    id: "R004",
    name: "Dormant Account Reactivation",
    points: 25,
    check: (txn, context) => context.dormantDays >= 90,
    reason: "Previously dormant account became active",
  },
  {
    id: "R005",
    name: "Circular Fund Transfer",
    points: 35,
    check: (txn, context) => context.circularTransfer === true,
    reason: "Circular fund transfer pattern detected",
  },
  {
    id: "R006",
    name: "Closed Account Transaction",
    points: 100,
    check: (txn) => txn.accountStatus === "CLOSED",
    reason: "Transaction references a closed account",
  },
  {
    id: "R007",
    name: "Negative Balance Violation",
    points: 100,
    check: (txn) => txn.balanceAfter < -(txn.overdraftLimit ?? 0),
    reason: "Balance exceeds permitted overdraft limit",
  },
  {
    id: "R008",
    name: "Transfer Reconciliation Failure",
    points: 60,
    check: (txn, context) => context.transferMismatch === true,
    reason: "Source and destination transfer legs do not reconcile",
  },
];
export function getRiskRules() {
  return RISK_RULES.map((rule) => ({
    ruleId: rule.id,
    name: rule.name,
    points: rule.points,
    description: rule.reason,
  }));
}
export function evaluateTransaction(transaction, context = {}) {
  if (
    typeof transaction.amount !== "number" ||
    !Number.isFinite(transaction.amount) ||
    transaction.amount < 0
  ) {
    throw new TypeError("Transaction amount must be a non-negative number");
  }

  const triggeredRules = RISK_RULES.filter((rule) =>
    rule.check(transaction, context),
  ).map((rule) => ({
    ruleId: rule.id,
    ruleName: rule.name,
    points: rule.points,
    reason: rule.reason,
  }));

  const rawScore = triggeredRules.reduce(
    (total, rule) => total + rule.points,
    0,
  );

  const riskScore = Math.min(rawScore, 100);

  let severity = "LOW";

  if (riskScore >= 75) {
    severity = "CRITICAL";
  } else if (riskScore >= 50) {
    severity = "HIGH";
  } else if (riskScore >= 25) {
    severity = "MEDIUM";
  }

  return {
    riskScore,
    severity,
    decision: riskScore > 0 ? "CREATE_ALERT" : "NO_ALERT",
    triggeredRules,
    evaluatedAt: new Date().toISOString(),
  };
}
export function getRiskThresholds() {
  return [
    { severity: "LOW", minScore: 0, maxScore: 24 },
    { severity: "MEDIUM", minScore: 25, maxScore: 49 },
    { severity: "HIGH", minScore: 50, maxScore: 74 },
    { severity: "CRITICAL", minScore: 75, maxScore: 100 },
  ];
}
