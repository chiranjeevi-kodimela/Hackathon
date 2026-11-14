import { getDashboardMetrics } from "../services/dataService.js";

export function getDashboard(req, res, next) {
  try {
    const metrics = getDashboardMetrics();

    res.status(200).json({
      success: true,
      message: "Dashboard metrics retrieved successfully",
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
}
