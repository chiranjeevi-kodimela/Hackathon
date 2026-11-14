import { Router } from "express";

import { listCases, showCase } from "../controllers/caseController.js";

const router = Router();

router.get("/", listCases);
router.get("/:caseId", showCase);

export default router;
