import { getDataset } from "./dataService.js";

export function getAlerts({
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
  let alerts = getDataset("alerts");

  if (severity) {
    alerts = alerts.filter((alert) => alert.severity === severity);
  }

  if (status) {
    alerts = alerts.filter((alert) => alert.status === status);
  }

  if (accountId) {
    alerts = alerts.filter((alert) => alert.accountId === accountId);
  }

  if (minScore !== undefined) {
    alerts = alerts.filter((alert) => alert.riskScore >= minScore);
  }

  if (maxScore !== undefined) {
    alerts = alerts.filter((alert) => alert.riskScore <= maxScore);
  }

  alerts.sort((a, b) => {
    const first =
      sortBy === "riskScore" ? a.riskScore : new Date(a.createdAt).getTime();

    const second =
      sortBy === "riskScore" ? b.riskScore : new Date(b.createdAt).getTime();

    return order === "asc" ? first - second : second - first;
  });

  const total = alerts.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  return {
    alerts: alerts.slice(startIndex, startIndex + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export function getAlertById(alertId) {
  return getDataset("alerts").find((alert) => alert.alertId === alertId);
}
