import { Router } from "express";
import {
  listTransactions,
  showTransaction,
} from "../controllers/transactionController.js";

const router = Router();

router.get("/", listTransactions);
router.get("/:transactionId", showTransaction);

export default router;
