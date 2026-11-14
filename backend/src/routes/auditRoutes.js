import { Router } from "express";

import {
  createAction,
  listActions,
  listAuditEvents,
} from "../controllers/auditController.js";

const router = Router();

router.post("/actions", createAction);
router.get("/actions", listActions);
router.get("/events", listAuditEvents);

export default router;
