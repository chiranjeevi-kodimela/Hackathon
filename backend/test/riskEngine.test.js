import assert from "node:assert/strict";
import test from "node:test";

import { evaluateTransaction } from "../src/services/riskEngine.js";

test("ordinary transactions do not create alerts", () => {
  const result = evaluateTransaction({
    amount: 5000,
    accountStatus: "ACTIVE",
    balanceAfter: 15000,
    overdraftLimit: 0,
  });

  assert.equal(result.riskScore, 0);
  assert.equal(result.severity, "LOW");
  assert.equal(result.decision, "NO_ALERT");
  assert.deepEqual(result.triggeredRules, []);
});

test("risk rules expose explainable evidence and cap scores", () => {
  const result = evaluateTransaction(
    {
      amount: 150000,
      accountStatus: "CLOSED",
      balanceAfter: -100,
      overdraftLimit: 0,
    },
    {
      velocityCount10m: 5,
      isNewDevice: true,
      dormantDays: 90,
      circularTransfer: true,
      transferMismatch: true,
    },
  );

  assert.equal(result.riskScore, 100);
  assert.equal(result.severity, "CRITICAL");
  assert.equal(result.decision, "CREATE_ALERT");
  assert.deepEqual(
    result.triggeredRules.map((rule) => rule.ruleId),
    ["R001", "R002", "R003", "R004", "R005", "R006", "R007", "R008"],
  );
  assert.ok(result.triggeredRules.every((rule) => rule.reason.length > 0));
});

test("invalid transaction amounts are rejected", () => {
  assert.throws(
    () => evaluateTransaction({ amount: -1 }),
    /non-negative number/,
  );
  assert.throws(
    () => evaluateTransaction({ amount: Number.NaN }),
    /non-negative number/,
  );
});
