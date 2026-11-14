import {
  getTransactions,
  getTransactionById,
} from "../services/transactionService.js";

export async function listTransactions(req, res, next) {
  try {
    const page = Number.parseInt(req.query.page ?? "1", 10);
    const limit = Number.parseInt(req.query.limit ?? "10", 10);

    const search = String(req.query.search ?? "").trim();
    const accountId = String(req.query.accountId ?? "").trim();
    const type = String(req.query.type ?? "")
      .trim()
      .toUpperCase();
    const status = String(req.query.status ?? "")
      .trim()
      .toUpperCase();

    const minAmount =
      req.query.minAmount === undefined
        ? undefined
        : Number(req.query.minAmount);

    const maxAmount =
      req.query.maxAmount === undefined
        ? undefined
        : Number(req.query.maxAmount);

    const startDate = String(req.query.startDate ?? "").trim();
    const endDate = String(req.query.endDate ?? "").trim();

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

    if (
      (minAmount !== undefined &&
        (!Number.isFinite(minAmount) || minAmount < 0)) ||
      (maxAmount !== undefined &&
        (!Number.isFinite(maxAmount) || maxAmount < 0))
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount filters must be non-negative numbers",
      });
    }

    if (
      minAmount !== undefined &&
      maxAmount !== undefined &&
      minAmount > maxAmount
    ) {
      return res.status(400).json({
        success: false,
        message: "minAmount cannot exceed maxAmount",
      });
    }

    const validTypes = ["CREDIT", "DEBIT", "TRANSFER_IN", "TRANSFER_OUT"];
    const validStatuses = ["COMPLETED", "PENDING", "FAILED"];

    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction status",
      });
    }

    if (
      (startDate && Number.isNaN(Date.parse(startDate))) ||
      (endDate && Number.isNaN(Date.parse(endDate)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date filter",
      });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "startDate cannot be after endDate",
      });
    }

    const result = await getTransactions({
      page,
      limit,
      search,
      accountId,
      type,
      status,
      minAmount,
      maxAmount,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function showTransaction(req, res, next) {
  try {
    const transaction = await getTransactionById(req.params.transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}
