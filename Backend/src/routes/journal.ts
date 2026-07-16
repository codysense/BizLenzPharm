import { Router } from "express";
import { JournalController } from "../controllers/journal";
import { authenticate, requireRole } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();
const journalController = new JournalController();
router.post(
  "/",
  authenticate,
  requireRole(["Senior Accountant"]),
  auditLogger("CREATE", "JOURNAL"),
  (req, res) => journalController.createJournal(req, res),
);
router.get(
  "/",
  authenticate,
  requireRole(["Auditor", "Senior Accountant"]),
  (req, res) => journalController.getJournal(req, res),
);

export default router;
