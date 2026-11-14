import prisma from "../config/prisma.js";

async function ensureCasesExist() {
  const alerts = await prisma.alert.findMany({
    orderBy: [{ accountId: "asc" }, { createdAt: "asc" }],
  });

  const grouped = new Map();

  for (const alert of alerts) {
    if (!grouped.has(alert.accountId)) grouped.set(alert.accountId, []);
    grouped.get(alert.accountId).push(alert);
  }

  const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

  const groups = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));

  const cases = groups.map(([accountId, items], index) => {
    const highest = items.reduce((a, b) =>
      severityRank[b.severity] > severityRank[a.severity] ? b : a,
    );

    return {
      caseId: `CASE-2026-${String(index + 1).padStart(6, "0")}`,
      title: `Risk investigation - ${accountId}`,
      description: `${items.length} alert(s) associated with account ${accountId}`,
      priority: highest.severity,
      createdAt: items[0].createdAt,
    };
  });

  if (cases.length) {
    await prisma.riskCase.createMany({
      data: cases,
      skipDuplicates: true,
    });
  }

  const links = groups.flatMap(([accountId, items], index) =>
    items.map((alert) => ({
      caseId: `CASE-2026-${String(index + 1).padStart(6, "0")}`,
      alertId: alert.alertId,
    })),
  );

  if (links.length) {
    await prisma.caseAlert.createMany({
      data: links,
      skipDuplicates: true,
    });
  }
}

function formatCase(item) {
  const alerts = item.alerts.map((link) => link.alert);

  return {
    caseId: item.caseId,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    assignedTo: item.assignedTo,
    alertIds: alerts.map((alert) => alert.alertId),
    totalAlerts: alerts.length,
    highestSeverity: item.priority,
    highestRiskScore: Math.max(0, ...alerts.map((alert) => alert.riskScore)),
    accountId: alerts[0]?.accountId ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    resolvedAt: item.resolvedAt,
  };
}

export async function getCases({
  page = 1,
  limit = 10,
  status = "",
  severity = "",
  accountId = "",
}) {
  await ensureCasesExist();

  const where = {};

  if (status) where.status = status;
  if (severity) where.priority = severity;

  if (accountId) {
    where.alerts = {
      some: { alert: { accountId } },
    };
  }

  const [items, total] = await Promise.all([
    prisma.riskCase.findMany({
      where,
      include: { alerts: { include: { alert: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.riskCase.count({ where }),
  ]);

  return {
    cases: items.map(formatCase),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCaseById(caseId) {
  await ensureCasesExist();

  const item = await prisma.riskCase.findUnique({
    where: { caseId },
    include: { alerts: { include: { alert: true } } },
  });

  return item
    ? {
        ...formatCase(item),
        alerts: item.alerts.map((link) => link.alert),
      }
    : null;
}
