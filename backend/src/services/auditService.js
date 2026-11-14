import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RUNTIME_DIR = path.resolve(__dirname, "../../data/runtime");

const ACTIONS_FILE = path.join(RUNTIME_DIR, "analyst_actions.json");
const AUDIT_FILE = path.join(RUNTIME_DIR, "audit_events.json");

function initializeFile(filePath) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf8");
  }
}

function readRecords(filePath) {
  initializeFile(filePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function appendRecord(filePath, record) {
  const records = readRecords(filePath);
  records.push(record);

  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}

export function saveAnalystAction(action) {
  appendRecord(ACTIONS_FILE, action);
}

export function saveAuditEvent(event) {
  appendRecord(AUDIT_FILE, event);
}

export function getAnalystActions() {
  return readRecords(ACTIONS_FILE);
}

export function getAuditEvents() {
  return readRecords(AUDIT_FILE);
}
