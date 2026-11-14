import prisma from "../config/prisma.js";
import { getRiskThresholds } from "../services/riskEngine.js";

export async function listRiskRules(req, res, next) {
  try {
    const rules = await prisma.riskRule.findMany({
      orderBy: { ruleId: "asc" },
    });

    res.status(200).json({
      success: true,
      data: {
        totalRules: rules.length,
        rules: rules.map((rule) => ({
          ruleId: rule.ruleId,
          name: rule.name,
          points: rule.points,
          description: rule.description,
          enabled: rule.enabled,
        })),
        thresholds: getRiskThresholds(),
      },
    });
  } catch (error) {
    next(error);
  }
}
