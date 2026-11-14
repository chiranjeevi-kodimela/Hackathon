import prisma from "../config/prisma.js";

export async function getAccounts({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  customerId = "",
}) {
  const where = {};

  if (search) {
    where.OR = [
      { accountId: { contains: search } },
      { customerId: { contains: search } },
      { accountType: { equals: search.toUpperCase() } },
    ];
  }

  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { accountId: "asc" },
    }),
    prisma.account.count({ where }),
  ]);

  return {
    accounts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAccountById(accountId) {
  return prisma.account.findUnique({
    where: { accountId },
  });
}
