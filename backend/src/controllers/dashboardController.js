import { getDashboardMetrics } from "../services/dashboardService.js";

export async function getDashboard(req, res, next) {
  try {
    const metrics = await getDashboardMetrics();

    res.status(200).json({
      success: true,
      message: "Dashboard metrics retrieved successfully",
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
}
