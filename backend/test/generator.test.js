import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(__dirname, "..");
const generator = path.join(backendDirectory, "scripts", "generateData.js");
const validator = path.join(backendDirectory, "scripts", "validateData.js");

function runNode(script, outputDirectory, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: backendDirectory,
    env: { ...process.env, RISKLENS_DATA_DIR: outputDirectory },
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `${script} failed:\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}

function fileChecksums(directory) {
  const checksums = new Map();
  const visit = (currentDirectory) => {
    for (const entry of fs.readdirSync(currentDirectory, {
      withFileTypes: true,
    })) {
      const absolutePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else {
        const relativePath = path.relative(directory, absolutePath);
        const digest = createHash("sha256")
          .update(fs.readFileSync(absolutePath))
          .digest("hex");
        checksums.set(relativePath, digest);
      }
    }
  };
  visit(directory);
  return checksums;
}

test("starter exports are deterministic and validate against ground truth", (t) => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "risklens-repro-"),
  );
  t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

  const firstOutput = path.join(temporaryDirectory, "first");
  const secondOutput = path.join(temporaryDirectory, "second");
  runNode(generator, firstOutput, ["--scale=starter", "--seed=20261022"]);
  runNode(generator, secondOutput, ["--scale=starter", "--seed=20261022"]);

  assert.deepEqual(
    fileChecksums(firstOutput),
    fileChecksums(secondOutput),
    "same seed and scale must produce identical exports",
  );

  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(firstOutput, "generated", "manifest.json"),
      "utf8",
    ),
  );
  assert.deepEqual(
    {
      customers: manifest.counts.customers,
      accounts: manifest.counts.accounts,
      transactions: manifest.counts.transactions,
      alerts: manifest.counts.alerts,
    },
    { customers: 100, accounts: 140, transactions: 1000, alerts: 10 },
  );
  assert.ok(
    fs.existsSync(path.join(firstOutput, "generated", "seed.sql")),
    "SQL seed export should be generated",
  );
  assert.ok(
    fs.existsSync(path.join(firstOutput, "generated", "transactions.csv")),
    "CSV exports should be generated",
  );

  runNode(validator, firstOutput);
  const report = JSON.parse(
    fs.readFileSync(
      path.join(firstOutput, "validation", "validation_report.json"),
      "utf8",
    ),
  );
  assert.equal(report.status, "PASSED");
  assert.equal(report.counts.transactions, 1000);
  assert.equal(report.evaluation.falsePositive, 0);
  assert.equal(report.evaluation.falseNegative, 0);
});
