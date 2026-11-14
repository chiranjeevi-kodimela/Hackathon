import { Router } from "express";
import { listRiskRules } from "../controllers/ruleController.js";

const router = Router();

router.get("/", listRiskRules);

export default router;
