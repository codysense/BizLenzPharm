import { Router } from "express";
import { PurchaseController } from "../controllers/purchase";
import { authenticate, authorize, requireRole } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();
const purchaseController = new PurchaseController();

// Apply authentication to all routes
router.use(authenticate);

// Purchase Orders
router.get(
  "/orders",
  requireRole([
    "Inventory Manager",
    "Senior Accountant",
    "Accountant",
    "Auditor",
  ]),
  purchaseController.getPurchases,
);
router.post(
  "/orders",
  requireRole(["Inventory Manager", "Senior Accountant"]),
  auditLogger("CREATE", "PURCHASE_ORDER"),
  purchaseController.createPurchase,
);
router.put(
  "/orders/:id",
  requireRole(["Inventory Manager", "Senior Accountant"]),
  auditLogger("UPDATE", "PURCHASE_ORDER"),
  purchaseController.updatePurchase,
);
router.delete(
  "/orders/:id",
  requireRole(["Inventory Manager", "Senior Accountant"]),
  auditLogger("DELETE", "PURCHASE_ORDER"),
  purchaseController.deletePurchase,
);
router.get(
  "/orders/:id/print",
  requireRole(["Inventory Manager", "Senior Accountant", "Auditor"]),
  purchaseController.printPurchaseOrder,
);

// Purchase Receipts and Invoices
router.post(
  "/orders/:id/receive",
  requireRole(["Inventory Manager", "Senior Accountant"]),
  auditLogger("RECEIVE", "PURCHASE_ORDER"),
  purchaseController.receivePurchase,
);
router.post(
  "/orders/:id/invoice",
  requireRole(["Inventory Manager", "Senior Accountant"]),
  auditLogger("INVOICE", "PURCHASE_ORDER"),
  purchaseController.invoicePurchase,
);

// Vendors
router.get(
  "/vendors",
  requireRole([
    "Inventory Manager",
    "Senior Accountant",
    "Accountant",
    "Auditor",
  ]),
  purchaseController.getVendors,
);

router.get("/vendors/:id", purchaseController.getVendorById);
router.post(
  "/vendors",
  requireRole(["Inventory Manager", "Senior Accountant"]),
  auditLogger("CREATE", "VENDOR"),
  purchaseController.createVendor,
);

export default router;
