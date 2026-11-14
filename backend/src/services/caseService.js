import { getDataset } from "./dataService.js";

function generateCases() {
  const alerts = getDataset("alerts");
  const groupedAlerts = new Map();

  // Group alerts belonging to the same account.
  for (const alert of alerts) {
    if (!groupedAlerts.has(alert.accountId)) {
      groupedAlerts.set(alert.accountId, []);
    }

    groupedAlerts.get(alert.accountId).push(alert);
  }

  const severityPriority = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  return Array.from(groupedAlerts.entries()).map(
    ([accountId, accountAlerts], index) => {
      const highestRiskAlert = accountAlerts.reduce((highest, current) =>
        severityPriority[current.severity] > severityPriority[highest.severity]
          ? current
          : highest,
      );

      return {
        caseId: `CASE-2026-${String(index + 1).padStart(6, "0")}`,
        accountId,
        alertIds: accountAlerts.map((alert) => alert.alertId),
        totalAlerts: accountAlerts.length,
        highestSeverity: highestRiskAlert.severity,
        highestRiskScore: Math.max(
          ...accountAlerts.map((alert) => alert.riskScore),
        ),
        status: "OPEN",
        createdAt: accountAlerts.map((alert) => alert.createdAt).sort()[0],
      };
    },
  );
}

export function getCases({
  page = 1,
  limit = 10,
  status = "",
  severity = "",
  accountId = "",
}) {
  let cases = generateCases();

  if (status) {
    cases = cases.filter((item) => item.status === status);
  }

  if (severity) {
    cases = cases.filter((item) => item.highestSeverity === severity);
  }

  if (accountId) {
    cases = cases.filter((item) => item.accountId === accountId);
  }

  cases.sort((a, b) => b.highestRiskScore - a.highestRiskScore);

  const total = cases.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  return {
    cases: cases.slice(startIndex, startIndex + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export function getCaseById(caseId) {
  const caseRecord = generateCases().find((item) => item.caseId === caseId);

  if (!caseRecord) {
    return undefined;
  }

  const alerts = getDataset("alerts").filter((alert) =>
    caseRecord.alertIds.includes(alert.alertId),
  );

  return {
    ...caseRecord,
    alerts,
  };
}
