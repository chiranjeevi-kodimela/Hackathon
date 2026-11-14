import prisma from "../config/prisma.js";

export async function getAlerts({
  page = 1,
  limit = 10,
  severity = "",
  status = "",
  accountId = "",
  minScore,
  maxScore,
  sortBy = "createdAt",
  order = "desc",
}) {
  const where = {};

  if (severity) where.severity = severity;
  if (status) where.status = status;
  if (accountId) where.accountId = accountId;

  if (minScore !== undefined || maxScore !== undefined) {
    where.riskScore = {};
    if (minScore !== undefined) where.riskScore.gte = minScore;
    if (maxScore !== undefined) where.riskScore.lte = maxScore;
  }

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: order },
    }),
    prisma.alert.count({ where }),
  ]);

  return {
    alerts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAlertById(alertId) {
  return prisma.alert.findUnique({
    where: { alertId },
  });
}
