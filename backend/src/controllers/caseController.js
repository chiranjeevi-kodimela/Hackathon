import { getCases, getCaseById } from "../services/caseService.js";

export async function listCases(req, res, next) {
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
      return res.status(400).json({ success: false, message: "Invalid page" });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res
        .status(400)
        .json({ success: false, message: "Limit must be between 1 and 100" });
    }

    if (
      status &&
      !["OPEN", "IN_REVIEW", "ESCALATED", "RESOLVED", "CLOSED"].includes(status)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid case status" });
    }

    if (severity && !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid severity" });
    }

    const result = await getCases({ page, limit, status, severity, accountId });

    res.status(200).json({
      success: true,
      data: result.cases,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function showCase(req, res, next) {
  try {
    const item = await getCaseById(req.params.caseId);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Case not found" });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}
