import { getAccounts, getAccountById } from "../services/accountService.js";

export function listAccounts(req, res, next) {
  try {
    const page = Number.parseInt(req.query.page ?? "1", 10);
    const limit = Number.parseInt(req.query.limit ?? "10", 10);
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "")
      .trim()
      .toUpperCase();
    const customerId = String(req.query.customerId ?? "").trim();

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

    const result = getAccounts({
      page,
      limit,
      search,
      status,
      customerId,
    });

    res.status(200).json({
      success: true,
      data: result.accounts,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export function showAccount(req, res, next) {
  try {
    const account = getAccountById(req.params.accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
}
