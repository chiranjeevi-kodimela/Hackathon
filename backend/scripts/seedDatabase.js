import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prisma from "../src/config/prisma.js";
import { getRiskRules } from "../src/services/riskEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data/generated");

const BATCH_SIZE = 1000;

function loadDataset(name) {
  const filePath = path.join(DATA_DIR, `${name}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset not found: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(data)) {
    throw new Error(`${name}.json must contain an array`);
  }

  return data;
}

async function importDataset(label, model, records) {
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const result = await prisma[model].createMany({
      data: batch,
      skipDuplicates: true,
    });

    inserted += result.count;
  }

  console.log(
    `${label}: ${records.length} records processed, ${inserted} inserted`,
  );
}

async function seedDatabase() {
  console.log("Starting RiskLens database import...\n");

  const customers = loadDataset("customers");
  const accounts = loadDataset("accounts");
  const merchants = loadDataset("merchants");
  const devices = loadDataset("devices");
  const transactions = loadDataset("transactions");
  const transfers = loadDataset("transfers");
  const alerts = loadDataset("alerts");

  // 1. Customers
  await importDataset(
    "Customers",
    "customer",
    customers.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    })),
  );

  // 2. Accounts
  await importDataset(
    "Accounts",
    "account",
    accounts.map((row) => ({
      ...row,
      initialBalance: String(row.initialBalance),
      overdraftLimit: String(row.overdraftLimit),
      openedAt: new Date(row.openedAt),
    })),
  );

  // 3. Merchants
  await importDataset("Merchants", "merchant", merchants);

  // 4. Devices
  await importDataset("Devices", "device", devices);

  // 5. Transactions
  await importDataset(
    "Transactions",
    "transaction",
    transactions.map((row) => ({
      ...row,
      amount: String(row.amount),
      balanceBefore: String(row.balanceBefore),
      balanceAfter: String(row.balanceAfter),
      timestamp: new Date(row.timestamp),
    })),
  );

  // 6. Transfers
  await importDataset(
    "Transfers",
    "transfer",
    transfers.map((row) => ({
      ...row,
      amount: String(row.amount),
    })),
  );

  // 7. Alerts
  await importDataset(
    "Alerts",
    "alert",
    alerts.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    })),
  );

  // 8. Risk rules
  const riskRules = getRiskRules().map((rule) => ({
    ...rule,
    enabled: true,
  }));

  await importDataset("Risk rules", "riskRule", riskRules);

  console.log("\nDatabase import completed.\n");

  // Verify database record counts
  const counts = {
    customers: await prisma.customer.count(),
    accounts: await prisma.account.count(),
    merchants: await prisma.merchant.count(),
    devices: await prisma.device.count(),
    transactions: await prisma.transaction.count(),
    transfers: await prisma.transfer.count(),
    alerts: await prisma.alert.count(),
    riskRules: await prisma.riskRule.count(),
  };

  console.log("MySQL record counts:");
  console.table(counts);
}

try {
  await seedDatabase();
} catch (error) {
  console.error("\nDatabase import failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
