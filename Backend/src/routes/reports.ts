import { Router } from "express";
import { ReportsController } from "../controllers/reports";
import { authenticate, authorize, requireRole } from "../middleware/auth";

const router = Router();
const reportsController = new ReportsController();

// Apply authentication to all routes
router.use(authenticate);

// Financial Reports
router.get(
  "/balance-sheet",
  requireRole(["General Manager", "Auditor", "Manager", "Senior Accountant"]),
  reportsController.getBalanceSheet,
);
router.get(
  "/profit-loss",
  requireRole(["General Manager", "Auditor", "Manager", "Senior Accountant"]),
  reportsController.getProfitAndLoss,
);
router.get(
  "/trial-balance",
  requireRole(["General Manager", "Auditor", "Manager", "Senior Accountant"]),
  reportsController.getTrialBalance,
);
router.get(
  "/general-ledger",
  requireRole(["General Manager", "Auditor", "Manager", "Senior Accountant"]),
  reportsController.getGeneralLedger,
);
router.get(
  "/cash-flow",
  requireRole(["General Manager", "Auditor", "Manager", "Senior Accountant"]),
  reportsController.getCashFlow,
);
router.get(
  "/vendor-balances",
  requireRole(["Inventory Manager", "Auditor", "Manager", "Senior Accountant"]),
  reportsController.getVendorBalances,
);
router.get(
  "/customer-balances",
  requireRole(["Senior Accountant", "Auditor", "Manager"]),
  reportsController.getCustomerBalances,
);
router.get(
  "/customer-ledger",
  requireRole(["Senior Accountant", "Auditor", "Manager"]),
  reportsController.getCustomerLedger,
);
router.get(
  "/vendor-ledger",
  requireRole(["Inventory Manager", "Auditor", "Manager", "Senior Accountant"]),
  reportsController.getVendorLedger,
);
router.get(
  "/vendor-ledger",
  requireRole(["Inventory Manager", "Auditor", "Manager", "Senior Accountant"]),
  reportsController.getVendorLedger,
);
router.get(
  "/cashAccount-balances",
  requireRole(["Senior Accountant", "Auditor", "Manager"]),
  reportsController.getCashAccountBalances,
);

// Operational Reports Accountant
router.get(
  "/inventory-aging",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Auditor",
    "Manager",
  ]),
  reportsController.getInventoryAging,
);
router.get(
  "/stock-card",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Auditor",
    "Manager",
  ]),
  reportsController.getStockCard,
);
router.get(
  "/production-variance",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Production Manager",
    "Senior Accountant",
    "Auditor",
    "Manager",
  ]),
  reportsController.getProductionVariance,
);
router.get(
  "/sales-by-item",
  requireRole(["Inventory Manager", "Senior Accountant", "Auditor", "Manager"]),
  reportsController.getSalesByItem,
);
router.get(
  "/pos-sales",
  requireRole(["Senior Accountant", "Auditor", "Manager", "POS User"]),
  reportsController.getPOSSalesReport,
);
router.get(
  "/sales-by-customer",
  requireRole(["Senior Accountant", "Auditor", "Manager", "POS User"]),
  reportsController.getSalesByCustomer,
);
router.get(
  "/purchases-by-vendor",
  requireRole(["Senior Accountant", "Auditor", "Manager", "Inventory Manager"]),
  reportsController.getPurchasesByVendor,
);
router.get(
  "/ar-ap-aging",
  requireRole(["Senior Accountant", "Auditor", "Manager", "Inventory Manager"]),
  reportsController.getArApAging,
);
router.get(
  "/production-summary",
  requireRole([
    "Senior Accountant",
    "Auditor",
    "Manager",
    "Inventory Manager",
    "Production Manager",
  ]),
  reportsController.getProductionSummary,
);
router.get(
  "/production-report",
  requireRole([
    "Senior Accountant",
    "Auditor",
    "Manager",
    "Inventory Manager",
    "Production Manager",
  ]),
  reportsController.getProductionReport,
);
router.get(
  "/material-usage",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Production Manger",
    "Senior Accountant",
    "Auditor",
    "Manager",
  ]),
  reportsController.getMaterialUsage,
);

//metabase
router.get("/metabase/dashboard", reportsController.getDashboardEmbed);

export default router;
