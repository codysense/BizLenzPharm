import { Router } from "express";
import { PosController } from "../controllers/pos";
import { authenticate, authorize, requireRole } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();
const posController = new PosController();

// Apply authentication to all routes
router.use(authenticate);

// POS Sessions
router.post(
  "/sessions",
  requireRole(["POS User", "Senior Accountant", "Accountant", "Manager"]),
  auditLogger("CREATE", "POS_SESSION"),
  posController.createSession,
);
router.patch(
  "/sessions/:id/close",
  requireRole(["POS User", "Senior Accountant", "Accountant"]),
  auditLogger("CLOSE", "POS_SESSION"),
  posController.closeSession,
);
router.get(
  "/sessions/current",
  requireRole(["POS User", "Senior Accountant", "Accountant", "Auditor"]),
  posController.getCurrentSession,
);

// POS Sales
router.post(
  "/sales",
  requireRole(["POS User", "Senior Accountant", "Accountant"]),
  auditLogger("CREATE", "POS_SALE"),
  posController.createSale,
);
router.get(
  "/sales",
  requireRole([
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Auditor",
    "Manager",
  ]),
  posController.getSales,
);
//Get Sales for Dashboard
router.get(
  "/sales/dashboard",
  requireRole([
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Auditor",
    "Manager",
  ]),
  posController.getSalesForDashboard,
);

//Get Sale by Sale No
router.get(
  "/sales/search/:saleNo",
  requireRole([
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Auditor",
    "Manager",
  ]),
  posController.getSalesBySalesNo,
);

router.get(
  "/sales/:id/print",
  requireRole([
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Auditor",
    "Manager",
  ]),
  posController.printReceipt,
);

//PosSale Payment
router.get(
  "/sales/:id/payments",
  requireRole([
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Auditor",
    "Manager",
  ]),
  posController.getPOSsalePayments,
);

// POS Returns
router.post(
  "/returns",
  requireRole(["POS User", "Senior Accountant", "Accountant", "Manager"]),
  auditLogger("CREATE", "POS_RETURN"),
  posController.createReturn,
);
router.get(
  "/returns",
  requireRole([
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Auditor",
    "Manager",
  ]),
  posController.getReturns,
);

// Customers with balances
router.get(
  "/customers-with-balances",
  requireRole(["POS User", "Senior Accountant", "Accountant", "Manager"]),
  posController.getCustomersWithBalances,
);

export default router;
