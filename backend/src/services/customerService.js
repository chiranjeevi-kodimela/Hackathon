import prisma from "../config/prisma.js";

export async function getCustomers({
  page = 1,
  limit = 10,
  search = "",
  kycStatus = "",
}) {
  const where = {};

  if (search) {
    where.OR = [
      { customerId: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (kycStatus) {
    where.kycStatus = kycStatus;
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { customerId: "asc" },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCustomerById(customerId) {
  return prisma.customer.findUnique({
    where: { customerId },
  });
}
