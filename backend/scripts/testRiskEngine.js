import { evaluateTransaction } from "../src/services/riskEngine.js";

const normalTransaction = {
  amount: 5000,
  accountStatus: "ACTIVE",
  balanceAfter: 15000,
  overdraftLimit: 0,
};

const normalResult = evaluateTransaction(normalTransaction);

console.log("NORMAL TRANSACTION:");
console.log(JSON.stringify(normalResult, null, 2));

const suspiciousTransaction = {
  amount: 150000,
  accountStatus: "ACTIVE",
  balanceAfter: 10000,
  overdraftLimit: 0,
};

const suspiciousContext = {
  velocityCount10m: 7,
  isNewDevice: true,
  dormantDays: 120,
  circularTransfer: true,
};

const suspiciousResult = evaluateTransaction(
  suspiciousTransaction,
  suspiciousContext,
);

console.log("\nSUSPICIOUS TRANSACTION:");
console.log(JSON.stringify(suspiciousResult, null, 2));
