import { Router } from "express";
import { OpeningStockController } from "../controllers/openingStock";
import { authenticate, requireRole } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();

// Controller
const openingStockController = new OpeningStockController();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Opening Stock
 */

// List Opening Stock Documents
router.get(
  "/",
  requireRole([
    "Inventory Manager",
    "Senior Accountant",
    "Accountant",
    "Auditor",
  ]),
  openingStockController.getOpeningStocks,
);

// Get Single Opening Stock
router.get(
  "/:id",
  requireRole([
    "Inventory Manager",
    "Senior Accountant",
    "Accountant",
    "Auditor",
  ]),
  openingStockController.getOpeningStock,
);

// Create / Post Opening Stock
router.post(
  "/",
  requireRole(["Inventory Manager", "Senior Accountant"]),
  auditLogger("CREATE", "OPENING_STOCK"),
  openingStockController.createOpeningStock,
);

export default router;
