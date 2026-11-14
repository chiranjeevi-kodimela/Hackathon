import { getAlerts, getAlertById } from "../services/alertService.js";

export async function listAlerts(req, res, next) {
  try {
    const page = Number.parseInt(req.query.page ?? "1", 10);
    const limit = Number.parseInt(req.query.limit ?? "10", 10);
    const severity = String(req.query.severity ?? "")
      .trim()
      .toUpperCase();
    const status = String(req.query.status ?? "")
      .trim()
      .toUpperCase();
    const accountId = String(req.query.accountId ?? "").trim();

    const minScore =
      req.query.minScore === undefined ? undefined : Number(req.query.minScore);
    const maxScore =
      req.query.maxScore === undefined ? undefined : Number(req.query.maxScore);

    const sortBy = String(req.query.sortBy ?? "createdAt").trim();
    const order = String(req.query.order ?? "desc")
      .trim()
      .toLowerCase();

    if (!Number.isInteger(page) || page < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Page must be a positive integer" });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res
        .status(400)
        .json({ success: false, message: "Limit must be between 1 and 100" });
    }

    if (severity && !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid severity" });
    }

    if (
      status &&
      !["OPEN", "ESCALATED", "DISMISSED", "RESOLVED"].includes(status)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid alert status" });
    }

    if (
      (minScore !== undefined &&
        (!Number.isFinite(minScore) || minScore < 0 || minScore > 100)) ||
      (maxScore !== undefined &&
        (!Number.isFinite(maxScore) || maxScore < 0 || maxScore > 100)) ||
      (minScore !== undefined && maxScore !== undefined && minScore > maxScore)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid risk score range" });
    }

    if (!["createdAt", "riskScore"].includes(sortBy)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "sortBy must be createdAt or riskScore",
        });
    }

    if (!["asc", "desc"].includes(order)) {
      return res
        .status(400)
        .json({ success: false, message: "order must be asc or desc" });
    }

    const result = await getAlerts({
      page,
      limit,
      severity,
      status,
      accountId,
      minScore,
      maxScore,
      sortBy,
      order,
    });

    res.status(200).json({
      success: true,
      data: result.alerts,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function showAlert(req, res, next) {
  try {
    const alert = await getAlertById(req.params.alertId);

    if (!alert) {
      return res
        .status(404)
        .json({ success: false, message: "Alert not found" });
    }

    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
}
