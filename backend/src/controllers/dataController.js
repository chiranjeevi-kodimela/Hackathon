import { getDataset } from "../services/dataService.js";

function paginate(items, req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const requestedLimit = Number.parseInt(req.query.limit, 10) || 20;
  const limit = Math.min(100, Math.max(1, requestedLimit));

  const total = items.length;
  const startIndex = (page - 1) * limit;

  res.status(200).json({
    success: true,
    data: items.slice(startIndex, startIndex + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export function getCustomers(req, res, next) {
  try {
    let customers = getDataset("customers");
    const search = req.query.search?.toLowerCase();

    if (search) {
      customers = customers.filter((customer) =>
        [
          customer.customerId,
          customer.firstName,
          customer.lastName,
          customer.email,
        ].some((value) => value?.toLowerCase().includes(search)),
      );
    }

    if (req.query.kycStatus) {
      customers = customers.filter(
        (customer) => customer.kycStatus === req.query.kycStatus,
      );
    }

    paginate(customers, req, res);
  } catch (error) {
    next(error);
  }
}

export function getAccounts(req, res, next) {
  try {
    let accounts = getDataset("accounts");

    if (req.query.customerId) {
      accounts = accounts.filter(
        (account) => account.customerId === req.query.customerId,
      );
    }

    if (req.query.status) {
      accounts = accounts.filter(
        (account) => account.status === req.query.status,
      );
    }

    if (req.query.accountType) {
      accounts = accounts.filter(
        (account) => account.accountType === req.query.accountType,
      );
    }

    paginate(accounts, req, res);
  } catch (error) {
    next(error);
  }
}

export function getTransactions(req, res, next) {
  try {
    let transactions = getDataset("transactions");

    if (req.query.accountId) {
      transactions = transactions.filter(
        (transaction) => transaction.accountId === req.query.accountId,
      );
    }

    if (req.query.type) {
      transactions = transactions.filter(
        (transaction) => transaction.type === req.query.type,
      );
    }

    if (req.query.status) {
      transactions = transactions.filter(
        (transaction) => transaction.status === req.query.status,
      );
    }

    if (req.query.minAmount !== undefined) {
      const minAmount = Number(req.query.minAmount);
      if (!Number.isFinite(minAmount)) {
        return res.status(400).json({
          success: false,
          message: "minAmount must be a valid number",
        });
      }
      transactions = transactions.filter((item) => item.amount >= minAmount);
    }

    if (req.query.maxAmount !== undefined) {
      const maxAmount = Number(req.query.maxAmount);
      if (!Number.isFinite(maxAmount)) {
        return res.status(400).json({
          success: false,
          message: "maxAmount must be a valid number",
        });
      }
      transactions = transactions.filter((item) => item.amount <= maxAmount);
    }

    paginate(transactions, req, res);
  } catch (error) {
    next(error);
  }
}

export function getAlerts(req, res, next) {
  try {
    let alerts = getDataset("alerts");

    if (req.query.severity) {
      alerts = alerts.filter(
        (alert) => alert.severity === req.query.severity.toUpperCase(),
      );
    }

    if (req.query.status) {
      alerts = alerts.filter(
        (alert) => alert.status === req.query.status.toUpperCase(),
      );
    }

    if (req.query.accountId) {
      alerts = alerts.filter(
        (alert) => alert.accountId === req.query.accountId,
      );
    }

    paginate(alerts, req, res);
  } catch (error) {
    next(error);
  }
}
