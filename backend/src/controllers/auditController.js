import {
  createAnalystAction,
  listAnalystActions,
} from "../services/analystActionService.js";

import { getAuditEvents } from "../services/auditService.js";

export function createAction(req, res, next) {
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

    const action = createAnalystAction({
      targetType: String(targetType).toUpperCase(),
      targetId: String(targetId).trim(),
      actionType: String(actionType).toUpperCase(),
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
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

export function listActions(req, res, next) {
  try {
    const targetId = String(req.query.targetId ?? "").trim();

    res.status(200).json({
      success: true,
      data: listAnalystActions({ targetId }),
    });
  } catch (error) {
    next(error);
  }
}

export function listAuditEvents(req, res, next) {
  try {
    const events = getAuditEvents();

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
}
