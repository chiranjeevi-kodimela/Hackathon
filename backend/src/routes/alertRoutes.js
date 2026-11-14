import { Router } from "express";
import { listAlerts, showAlert } from "../controllers/alertController.js";

const router = Router();

router.get("/", listAlerts);
router.get("/:alertId", showAlert);

export default router;
