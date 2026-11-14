import prisma from "../config/prisma.js";

export async function getTransactions({
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
  const where = {};

  if (search) {
    where.transactionId = { contains: search };
  }

  if (accountId) where.accountId = accountId;
  if (type) where.type = type;
  if (status) where.status = status;

  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {};
    if (minAmount !== undefined) where.amount.gte = minAmount;
    if (maxAmount !== undefined) where.amount.lte = maxAmount;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { timestamp: "desc" },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTransactionById(transactionId) {
  return prisma.transaction.findUnique({
    where: { transactionId },
  });
}
