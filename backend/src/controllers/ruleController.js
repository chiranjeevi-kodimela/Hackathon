import { getRiskRules, getRiskThresholds } from "../services/riskEngine.js";

export function listRiskRules(req, res) {
  const rules = getRiskRules();
  const thresholds = getRiskThresholds();

  res.status(200).json({
    success: true,
    data: {
      totalRules: rules.length,
      rules,
      thresholds,
    },
  });
}
