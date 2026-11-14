import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prisma from "../src/config/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(
  process.env.RISKLENS_DATA_DIR || path.join(__dirname, "../data/generated"),
);

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

function uniqueWhere(fields, record) {
  const values = Object.fromEntries(fields.map((field) => [field, record[field]]));
  return fields.length === 1
    ? values
    : { [fields.join("_")]: values };
}

function recordKey(fields, record) {
  return JSON.stringify(fields.map((field) => record[field]));
}

async function importDataset(
  label,
  model,
  records,
  uniqueFields,
  relations = [],
) {
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const existing = await prisma[model].findMany({
      where:
        uniqueFields.length === 1
          ? {
              [uniqueFields[0]]: {
                in: batch.map((record) => record[uniqueFields[0]]),
              },
            }
          : {
              OR: batch.map((record) =>
                Object.fromEntries(
                  uniqueFields.map((field) => [field, record[field]]),
                ),
              ),
            },
      select: Object.fromEntries(uniqueFields.map((field) => [field, true])),
    });
    const existingKeys = new Set(
      existing.map((record) => recordKey(uniqueFields, record)),
    );
    const newRecords = [];

    for (const record of batch) {
      if (!existingKeys.has(recordKey(uniqueFields, record))) {
        newRecords.push(record);
        continue;
      }

      const relationFields = new Set(relations.map((relation) => relation.field));
      const data = Object.fromEntries(
        Object.entries(record).filter(
          ([field]) =>
            !uniqueFields.includes(field) && !relationFields.has(field),
        ),
      );
      for (const relation of relations) {
        const relationValues = relation.fields
          ? Object.fromEntries(
              relation.fields.map((field) => [field, record[field]]),
            )
          : { [relation.field]: record[relation.field] };
        const hasReference = Object.values(relationValues).every(
          (value) => value !== null && value !== undefined,
        );
        data[relation.name] = hasReference
          ? {
              connect: uniqueWhere(
                relation.targetFields,
                Object.fromEntries(
                  relation.targetFields.map((field, index) => [
                    field,
                    relation.fields
                      ? relationValues[relation.fields[index]]
                      : relationValues[relation.field],
                  ]),
                ),
              ),
            }
          : { disconnect: true };
      }
      await prisma[model].update({
        where: uniqueWhere(uniqueFields, record),
        data,
      });
      updated++;
    }

    if (newRecords.length) {
      const result = await prisma[model].createMany({
        data: newRecords,
        skipDuplicates: true,
      });
      inserted += result.count;
    }
  }

  console.log(
    `${label}: ${records.length} processed, ${inserted} inserted, ${updated} refreshed`,
  );
}

async function seedDatabase() {
  console.log("Starting RiskLens database import...\n");

  const customers = loadDataset("customers");
  const accounts = loadDataset("accounts");
  const accountStatusEvents = loadDataset("account_status_events");
  const merchants = loadDataset("merchants");
  const devices = loadDataset("devices");
  const transactions = loadDataset("transactions");
  const transfers = loadDataset("transfers");
  const riskRules = loadDataset("risk_rules");
  const alerts = loadDataset("alerts");
  const alertRules = loadDataset("alert_rules");
  const cases = loadDataset("cases");
  const caseAlerts = loadDataset("case_alerts");
  const analystActions = loadDataset("analyst_actions");
  const auditEvents = loadDataset("audit_events");

  // 1. Customers
  await importDataset(
    "Customers",
    "customer",
    customers.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    })),
    ["customerId"],
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
      statusSince: new Date(row.statusSince),
    })),
    ["accountId"],
    [{ field: "customerId", name: "customer", targetFields: ["customerId"] }],
  );
  await importDataset(
    "Account status events",
    "accountStatusEvent",
    accountStatusEvents.map((row) => ({
      ...row,
      previousStatusSince: new Date(row.previousStatusSince),
      effectiveAt: new Date(row.effectiveAt),
    })),
    ["eventId"],
    [{ field: "accountId", name: "account", targetFields: ["accountId"] }],
  );

  // 3. Merchants
  await importDataset("Merchants", "merchant", merchants, ["merchantId"]);

  // 4. Devices
  await importDataset("Devices", "device", devices, ["deviceId"]);

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
    ["transactionId"],
    [
      { field: "accountId", name: "account", targetFields: ["accountId"] },
      { field: "merchantId", name: "merchant", targetFields: ["merchantId"] },
      { field: "deviceId", name: "device", targetFields: ["deviceId"] },
    ],
  );

  // 6. Transfers
  await importDataset(
    "Transfers",
    "transfer",
    transfers.map((row) => ({
      ...row,
      amount: String(row.amount),
    })),
    ["transferId"],
    [
      {
        field: "sourceAccountId",
        name: "sourceAccount",
        targetFields: ["accountId"],
      },
      {
        field: "destinationAccountId",
        name: "destinationAccount",
        targetFields: ["accountId"],
      },
      {
        field: "sourceTransactionId",
        name: "sourceTransaction",
        targetFields: ["transactionId"],
      },
      {
        field: "destinationTransactionId",
        name: "destinationTransaction",
        targetFields: ["transactionId"],
      },
    ],
  );

  // 7. Rules must exist before alert-rule bridge rows are inserted.
  await importDataset(
    "Risk rules",
    "riskRule",
    riskRules.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    })),
    ["ruleId"],
  );

  // 8. Alerts and triggered-rule bridge rows
  await importDataset(
    "Alerts",
    "alert",
    alerts.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    })),
    ["alertId"],
    [
      { field: "transactionId", name: "transaction", targetFields: ["transactionId"] },
      { field: "accountId", name: "account", targetFields: ["accountId"] },
    ],
  );
  await importDataset("Alert-rule links", "alertRule", alertRules, [
    "alertId",
    "ruleId",
  ]);

  // 9. Cases and their alert bridge rows
  await importDataset(
    "Cases",
    "riskCase",
    cases.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : null,
    })),
    ["caseId"],
  );
  await importDataset("Case-alert links", "caseAlert", caseAlerts, [
    "caseId",
    "alertId",
  ]);

  // 10. Analyst dispositions and audit history
  await importDataset(
    "Analyst actions",
    "analystAction",
    analystActions.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    })),
    ["actionId"],
    [
      { field: "alertId", name: "alert", targetFields: ["alertId"] },
      { field: "caseId", name: "riskCase", targetFields: ["caseId"] },
      {
        fields: ["caseAlertCaseId", "caseAlertAlertId"],
        name: "caseAlert",
        targetFields: ["caseId", "alertId"],
      },
    ],
  );
  await importDataset(
    "Audit events",
    "auditEvent",
    auditEvents.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    })),
    ["eventId"],
  );

  console.log("\nDatabase import completed.\n");

  // Verify database record counts
  const counts = {
    customers: await prisma.customer.count(),
    accounts: await prisma.account.count(),
    accountStatusEvents: await prisma.accountStatusEvent.count(),
    merchants: await prisma.merchant.count(),
    devices: await prisma.device.count(),
    transactions: await prisma.transaction.count(),
    transfers: await prisma.transfer.count(),
    riskRules: await prisma.riskRule.count(),
    alerts: await prisma.alert.count(),
    alertRules: await prisma.alertRule.count(),
    cases: await prisma.riskCase.count(),
    caseAlerts: await prisma.caseAlert.count(),
    analystActions: await prisma.analystAction.count(),
    auditEvents: await prisma.auditEvent.count(),
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
