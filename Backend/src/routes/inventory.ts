import { Router } from "express";
import { InventoryController } from "../controllers/inventory";
import { authenticate, authorize, requireRole } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();
const inventoryController = new InventoryController();

// Apply authentication to all routes
router.use(authenticate);

// Items
router.get(
  "/items",
  requireRole([
    "Senior Accountant",
    "POS User",
    "Production Manager",
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Manager",
    "Auditor",
    "Accountant",
  ]),
  inventoryController.getItems,
);

router.get(
  "/items/:id",
  requireRole([
    "Senior Accountant",
    "POS User",
    "Production Manager",
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Manager",
    "Auditor",
  ]),
  inventoryController.getItemById,
);

router.post(
  "/items",
  requireRole([
    "Inventory Manager",
    "Senior Accountant, Production Manager",
    "Manager",
  ]),
  auditLogger("CREATE", "ITEM"),
  inventoryController.createItem,
);

router.put(
  "/items",
  requireRole([
    "Inventory Manager",
    "Senior Accountant, Production Manager",
    "Manager",
  ]),
  auditLogger("UPDATE", "ITEM"),
  inventoryController.updateItem,
);
router.delete(
  "/items/:sku",
  requireRole([
    "Inventory Manager",
    "Senior Accountant",
    "Production Manager",
    "Manager",
  ]),
  auditLogger("DELETE", "ITEM"),
  inventoryController.deleteItem,
);

// BOMs
router.get(
  "/boms",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Production Manager",
    "Senior Accountant",
    "Auditor",
  ]),
  inventoryController.getBoms,
);
router.post(
  "/boms",
  requireRole(["Inventory Manager", "Production Manager", "Senior Accountant"]),
  auditLogger("CREATE", "BOM"),
  inventoryController.createBom,
);

// Inventory transactions
router.post(
  "/adjust",
  requireRole([
    "Inventory Manager",
    "Senior Accountantr",
    "Production Manager",
  ]),
  auditLogger("ADJUST", "INVENTORY"),
  inventoryController.adjustInventory,
);
router.post(
  "/transfer",
  requireRole(["Inventory Manager", "Senior Accountant", "Production Manager"]),
  auditLogger("TRANSFER", "INVENTORY"),
  inventoryController.transferInventoryBulk,
);
router.get(
  "/inventory/transfers",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Production Manager",
    "Auditor",
  ]),
  inventoryController.getInventoryTransfers,
);

// Reports
router.get(
  "/ledger",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Production Manager",
    "Auditor",
    "POS User",
  ]),
  inventoryController.getInventoryLedger,
);
router.get(
  "/ledger/export",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Production Manager",
    "Auditor",
    "POS User",
  ]),
  inventoryController.exportInventoryLedger,
);
router.get(
  "/valuation",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Production Manager",
    "Auditor",
  ]),
  inventoryController.getInventoryValuation,
);

// Warehouses
router.get(
  "/warehouses",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "POS User",
    "Production Manager",
    "Auditor",
    "Manager",
  ]),
  inventoryController.getWarehouses,
);
router.get(
  "/warehouses/list",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Production Manager",
    "Auditor",
    "Manager",
  ]),
  inventoryController.getWarehousesList,
);
router.post(
  "/warehouses",
  requireRole(["Inventory Manager", "Senior Accountant", "Production Manager"]),
  auditLogger("CREATE", "WAREHOUSE"),
  inventoryController.createWarehouse,
);
router.put(
  "/warehouses/:id",
  requireRole(["Inventory Manager", "Senior Accountant", "Production Manager"]),
  auditLogger("UPDATE", "WAREHOUSE"),
  inventoryController.updateWarehouse,
);

// Locations
router.get(
  "/locations",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Production Manager",
    "Auditor",
    "Manager",
  ]),
  inventoryController.getLocations,
);
router.post(
  "/locations",
  requireRole(["Inventory Manager", "Senior Accountant", "Production Manager"]),
  auditLogger("CREATE", "LOCATION"),
  inventoryController.createLocation,
);
router.put(
  "/locations/:id",
  requireRole(["Inventory Manager", "Senior Accountant", "Production Manager"]),
  auditLogger("UPDATE", "LOCATION"),
  inventoryController.updateLocation,
);

//UOMs
router.get(
  "/uoms",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Accountant",
    "Production Manager",
    "Auditor",
  ]),
  inventoryController.getUOMs,
);
router.post(
  "/uoms",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Production Manager",
  ]),
  auditLogger("CREATE", "UOM"),
  inventoryController.createUOM,
);
router.put(
  "/uoms/:id",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Production Manager",
  ]),
  auditLogger("UPDATE", "UOM"),
  inventoryController.updateUOM,
);
router.delete(
  "/uoms/:id",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Production Manager",
  ]),
  auditLogger("DELETE", "UOM"),
  inventoryController.deleteUOM,
);

// Inventory transfers
router.get(
  "/transfers",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Auditor",
    "Production Manager",
  ]),
  inventoryController.getInventoryTransfers,
);

//Print Inventory Transfer
router.get(
  "/transfers/print/:id",
  requireRole([
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Senior Accountant",
    "Auditor",
    "Production Manager",
  ]),
  inventoryController.printInventoryTransfer,
);

// Item stock by warehouse
router.get(
  "/stock/:itemId/:warehouseId",
  requireRole([
    "Inventory Manager",
    "Production Manager",
    "Assistant Inventory Manager",
    "POS User",
    "Accountant",
    "Senior Accountant",
    "Auditor",
    "Manager",
  ]),
  inventoryController.getItemStock,
);

export default router;
