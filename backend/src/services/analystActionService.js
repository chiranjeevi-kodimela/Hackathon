import { randomUUID } from "node:crypto";
import prisma from "../config/prisma.js";

const ALLOWED_ACTIONS = [
  "ESCALATE_ALERT",
  "DISMISS_ALERT",
  "RESOLVE_CASE",
  "REOPEN_CASE",
  "ADD_NOTE",
];

export async function createAnalystAction({
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

  if (typeof targetId !== "string" || !targetId.trim()) {
    throw new Error("Target ID is required");
  }

  if (typeof analystId !== "string" || !analystId.trim()) {
    throw new Error("Analyst ID is required");
  }

  if (typeof notes !== "string") {
    throw new Error("Notes must be a string");
  }

  if (
    ["ESCALATE_ALERT", "DISMISS_ALERT"].includes(actionType) &&
    targetType !== "ALERT"
  ) {
    throw new Error("This action requires an ALERT target");
  }

  if (
    ["RESOLVE_CASE", "REOPEN_CASE"].includes(actionType) &&
    targetType !== "CASE"
  ) {
    throw new Error("This action requires a CASE target");
  }

  if (actionType === "ADD_NOTE" && !notes.trim()) {
    throw new Error("A note is required for ADD_NOTE");
  }

  return prisma.$transaction(async (tx) => {
    let alertId = null;
    let caseId = null;

    if (targetType === "ALERT") {
      const alert = await tx.alert.findUnique({ where: { alertId: targetId } });
      if (!alert) throw new Error("ALERT target not found");

      alertId = targetId;

      if (actionType === "ESCALATE_ALERT") {
        if (alert.status !== "OPEN") {
          throw new Error(`Invalid transition: cannot escalate an alert in ${alert.status} status`);
        }
        await tx.alert.update({
          where: { alertId },
          data: { status: "ESCALATED" },
        });
      }

      if (actionType === "DISMISS_ALERT") {
        if (!["OPEN", "ESCALATED"].includes(alert.status)) {
          throw new Error(`Invalid transition: cannot dismiss an alert in ${alert.status} status`);
        }
        await tx.alert.update({
          where: { alertId },
          data: { status: "DISMISSED" },
        });
      }
    } else {
      const riskCase = await tx.riskCase.findUnique({
        where: { caseId: targetId },
      });
      if (!riskCase) throw new Error("CASE target not found");

      caseId = targetId;

      if (actionType === "RESOLVE_CASE") {
        if (!["OPEN", "IN_REVIEW", "ESCALATED"].includes(riskCase.status)) {
          throw new Error(`Invalid transition: cannot resolve a case in ${riskCase.status} status`);
        }
        await tx.riskCase.update({
          where: { caseId },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        });
      }

      if (actionType === "REOPEN_CASE") {
        if (!["RESOLVED", "CLOSED"].includes(riskCase.status)) {
          throw new Error(`Invalid transition: cannot reopen a case in ${riskCase.status} status`);
        }
        await tx.riskCase.update({
          where: { caseId },
          data: { status: "OPEN", resolvedAt: null },
        });
      }
    }

    const uniqueId = randomUUID().replaceAll("-", "").slice(0, 24);
    const actionId = `ACT-${uniqueId}`;
    const eventId = `AUD-${uniqueId}`;

    const action = await tx.analystAction.create({
      data: {
        actionId,
        alertId,
        caseId,
        analystId,
        actionType,
        notes: notes.trim() || null,
      },
    });

    await tx.auditEvent.create({
      data: {
        eventId,
        entityType: targetType,
        entityId: targetId,
        eventType: actionType,
        actorId: analystId,
        details: {
          actionId,
          notes: notes.trim(),
        },
      },
    });

    return action;
  });
}

export async function listAnalystActions({ targetId = "" } = {}) {
  return prisma.analystAction.findMany({
    where: targetId
      ? {
          OR: [{ alertId: targetId }, { caseId: targetId }],
        }
      : {},
    orderBy: { createdAt: "desc" },
  });
}
