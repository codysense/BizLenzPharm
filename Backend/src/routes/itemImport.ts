import { Router } from "express";
import { ItemImportController } from "../controllers/itemImport";
import { authenticate, requireRole } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();

// Controller
const itemImportController = new ItemImportController();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Item Import
 */

// List Imported Items
// router.get(
//   "/",
//   requireRole([
//     "Inventory Manager",
//     "Senior Accountant",
//     "Accountant",
//     "Auditor",
//   ]),
//   itemImportController.getImportedItems,
// );

// // Get Single Opening Stock
// router.get(
//   "/:id",
//   requireRole([
//     "Inventory Manager",
//     "Senior Accountant",
//     "Accountant",
//     "Auditor",
//   ]),
//   itemImportController.getImportedItem,
// );

// Create imported items from JSON
router.post(
  "/",
  requireRole(["Inventory Manager", "Senior Accountant"]),
  auditLogger("CREATE", "ITEM_IMPORT"),
  itemImportController.importFromJSON,
);

export default router;
