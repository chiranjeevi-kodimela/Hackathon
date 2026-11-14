import { Router } from "express";
import { listAccounts, showAccount } from "../controllers/accountController.js";

const router = Router();

router.get("/", listAccounts);
router.get("/:accountId", showAccount);

export default router;
