import {
  createAnalystAction,
  listAnalystActions,
} from "../services/analystActionService.js";

import { getAuditEvents } from "../services/auditService.js";

export async function createAction(req, res, next) {
  try {
    const {
      targetType,
      targetId,
      actionType,
      analystId,
      notes = "",
    } = req.body;

    if (!targetType || !targetId || !actionType || !analystId) {
      return res.status(400).json({
        success: false,
        message: "targetType, targetId, actionType and analystId are required",
      });
    }

    const action = await createAnalystAction({
      targetType: String(targetType).trim().toUpperCase(),
      targetId: String(targetId).trim(),
      actionType: String(actionType).trim().toUpperCase(),
      analystId: String(analystId).trim(),
      notes: String(notes),
    });

    res.status(201).json({
      success: true,
      message: "Analyst action recorded successfully",
      data: action,
    });
  } catch (error) {
    if (
      error.message.includes("not found") ||
      error.message.includes("must") ||
      error.message.includes("requires") ||
      error.message.includes("Invalid")
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    next(error);
  }
}

export async function listActions(req, res, next) {
  try {
    const targetId = String(req.query.targetId ?? "").trim();
    const actions = await listAnalystActions({ targetId });

    res.status(200).json({ success: true, data: actions });
  } catch (error) {
    next(error);
  }
}

export async function listAuditEvents(req, res, next) {
  try {
    const events = await getAuditEvents();

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
}
