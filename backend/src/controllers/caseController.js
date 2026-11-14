import { getCases, getCaseById } from "../services/caseService.js";

export function listCases(req, res, next) {
  try {
    const page = Number.parseInt(req.query.page ?? "1", 10);
    const limit = Number.parseInt(req.query.limit ?? "10", 10);

    const status = String(req.query.status ?? "")
      .trim()
      .toUpperCase();

    const severity = String(req.query.severity ?? "")
      .trim()
      .toUpperCase();

    const accountId = String(req.query.accountId ?? "").trim();

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    const validStatuses = ["OPEN", "IN_PROGRESS", "CLOSED"];
    const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid case status",
      });
    }

    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: "Invalid severity",
      });
    }

    const result = getCases({
      page,
      limit,
      status,
      severity,
      accountId,
    });

    res.status(200).json({
      success: true,
      data: result.cases,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export function showCase(req, res, next) {
  try {
    const caseRecord = getCaseById(req.params.caseId);

    if (!caseRecord) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    res.status(200).json({
      success: true,
      data: caseRecord,
    });
  } catch (error) {
    next(error);
  }
}
