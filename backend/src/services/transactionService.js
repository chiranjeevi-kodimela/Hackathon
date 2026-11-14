import { getDataset } from "./dataService.js";

export function getTransactions({
  page = 1,
  limit = 10,
  search = "",
  accountId = "",
  type = "",
  status = "",
  minAmount,
  maxAmount,
  startDate = "",
  endDate = "",
}) {
  let transactions = getDataset("transactions");

  if (search) {
    const term = search.toLowerCase();

    transactions = transactions.filter((transaction) =>
      transaction.transactionId.toLowerCase().includes(term),
    );
  }

  if (accountId) {
    transactions = transactions.filter(
      (transaction) => transaction.accountId === accountId,
    );
  }

  if (type) {
    transactions = transactions.filter(
      (transaction) => transaction.type === type,
    );
  }

  if (status) {
    transactions = transactions.filter(
      (transaction) => transaction.status === status,
    );
  }

  if (minAmount !== undefined) {
    transactions = transactions.filter(
      (transaction) => transaction.amount >= minAmount,
    );
  }

  if (maxAmount !== undefined) {
    transactions = transactions.filter(
      (transaction) => transaction.amount <= maxAmount,
    );
  }

  if (startDate) {
    transactions = transactions.filter(
      (transaction) => transaction.timestamp >= startDate,
    );
  }

  if (endDate) {
    transactions = transactions.filter(
      (transaction) => transaction.timestamp <= endDate,
    );
  }

  // Newest transactions first
  transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = transactions.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  return {
    transactions: transactions.slice(startIndex, startIndex + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export function getTransactionById(transactionId) {
  return getDataset("transactions").find(
    (transaction) => transaction.transactionId === transactionId,
  );
}
