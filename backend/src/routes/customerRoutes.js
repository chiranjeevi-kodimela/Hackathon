import { Router } from "express";
import {
  listCustomers,
  showCustomer,
} from "../controllers/customerController.js";

const router = Router();

router.get("/", listCustomers);
router.get("/:customerId", showCustomer);

export default router;
