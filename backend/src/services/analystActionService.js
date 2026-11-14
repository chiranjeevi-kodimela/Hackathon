import { getDataset } from "./dataService.js";
import {
  saveAnalystAction,
  saveAuditEvent,
  getAnalystActions,
} from "./auditService.js";

const ALLOWED_ACTIONS = [
  "ESCALATE_ALERT",
  "DISMISS_ALERT",
  "RESOLVE_CASE",
  "REOPEN_CASE",
  "ADD_NOTE",
];

export function createAnalystAction({
  targetType,
  targetId,
  actionType,
  analystId,
  notes = "",
}) {
  if (!["ALERT", "CASE"].includes(targetType)) {
    throw new Error("Target type must be ALERT or CASE");
  }

  if (!ALLOWED_ACTIONS.includes(actionType)) {
    throw new Error("Invalid analyst action type");
  }

  if (actionType.includes("ALERT") && targetType !== "ALERT") {
    throw new Error("This action requires an ALERT target");
  }

  if (
    (actionType === "RESOLVE_CASE" || actionType === "REOPEN_CASE") &&
    targetType !== "CASE"
  ) {
    throw new Error("This action requires a CASE target");
  }

  if (actionType === "ADD_NOTE" && !notes.trim()) {
    throw new Error("A note is required for ADD_NOTE");
  }

  const exists =
    targetType === "ALERT"
      ? getDataset("alerts").some((item) => item.alertId === targetId)
      : getDataset("alerts").some(
          (item) => item.accountId === targetId || item.alertId === targetId,
        );

  if (!exists) {
    throw new Error(`${targetType} target not found`);
  }

  const actionId = `ACT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const timestamp = new Date().toISOString();

  const action = {
    actionId,
    targetType,
    targetId,
    actionType,
    analystId,
    notes,
    timestamp,
  };

  const auditEvent = {
    eventId: `AUD-${actionId}`,
    eventType: "ANALYST_ACTION_RECORDED",
    actionId,
    targetType,
    targetId,
    analystId,
    details: {
      actionType,
      notes,
    },
    timestamp,
  };

  // Preserve both records as append-only history.
  saveAnalystAction(action);
  saveAuditEvent(auditEvent);

  return action;
}

export function listAnalystActions({ targetId = "" } = {}) {
  let actions = getAnalystActions();

  if (targetId) {
    actions = actions.filter((action) => action.targetId === targetId);
  }

  return actions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
