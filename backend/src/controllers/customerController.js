import { getCustomers, getCustomerById } from "../services/customerService.js";

export function listCustomers(req, res, next) {
  try {
    const page = Number.parseInt(req.query.page ?? "1", 10);
    const limit = Number.parseInt(req.query.limit ?? "10", 10);
    const search = String(req.query.search ?? "").trim();
    const kycStatus = String(req.query.kycStatus ?? "")
      .trim()
      .toUpperCase();

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

    const result = getCustomers({ page, limit, search, kycStatus });

    res.status(200).json({
      success: true,
      data: result.customers,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export function showCustomer(req, res, next) {
  try {
    const customer = getCustomerById(req.params.customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}
