import { Router } from "express";
import {
  getCustomers,
  getAccounts,
  getTransactions,
  getAlerts,
} from "../controllers/dataController.js";

const router = Router();

router.get("/customers", getCustomers);
router.get("/accounts", getAccounts);
router.get("/transactions", getTransactions);
router.get("/alerts", getAlerts);

export default router;
