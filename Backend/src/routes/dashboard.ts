import { Router } from "express";
import { DashboardController } from "../controllers/dashboard";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();
const controller = new DashboardController();

router.use(authenticate);

router.get(
  "/executive-summary",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  controller.getExecutiveSummary,
);

router.get(
  "/top-products",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  controller.getTopProducts,
);

router.get(
  "/top-customers",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  controller.getTopCustomers,
);

router.get(
  "/expense-breakdown",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  controller.getExpenseBreakdown,
);

router.get(
  "/alerts",
  requireRole([
    "General Manager",
    "Senior Accountant",
    "Auditor",
    "Inventory Manager",
    "Production Manager",
  ]),
  controller.getAlerts,
);

export default router;
