import { Router } from "express";
import { SalesController } from "../controllers/sales";
import { authenticate, authorize, requireRole } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();
const salesController = new SalesController();

// Apply authentication to all routes
router.use(authenticate);

// Sales Orders
router.get(
  "/orders",
  requireRole([
    "Senior Accountant",
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Auditor",
    "Manager",
  ]),
  salesController.getSales,
);
router.post(
  "/orders",
  requireRole([
    "Senior Accountant",
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Manager",
  ]),
  auditLogger("CREATE", "SALES_ORDER"),
  salesController.createSale,
);
router.put(
  "/orders/:id",
  requireRole([
    "Senior Accountant",
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Manager",
  ]),
  auditLogger("UPDATE", "SALES_ORDER"),
  salesController.updateSale,
);
router.delete(
  "/orders/:id",
  requireRole(["Senior Accountant"]),
  auditLogger("DELETE", "SALES_ORDER"),
  salesController.deleteSale,
);
router.get(
  "/orders/:id/print",
  requireRole([
    "Senior Accountant",
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Auditor",
    "Manager",
  ]),
  salesController.printSaleInvoice,
);

// Sales Delivery and Invoicing
router.post(
  "/orders/:id/deliver",
  requireRole(["Senior Accountant", "Accountant", "Manager"]),
  auditLogger("DELIVER", "SALES_ORDER"),
  salesController.deliverSale,
);
router.post(
  "/orders/:id/invoice",
  requireRole(["Senior Accountant", "Accountant", "Manager"]),
  auditLogger("INVOICE", "SALES_ORDER"),
  salesController.invoiceSale,
);

// Sales returns
router.post(
  "/sales-return",
  requireRole([
    "Senior Accountant",
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Manager",
  ]),
  auditLogger("CREATE", "SALES_RETURN"),
  salesController.createSalesReturn,
);

router.post(
  "/sales-return/confirm/:id",
  requireRole([
    "Senior Accountant",
    "Senior Accountant",
    "Accountant",
    "Manager",
  ]),
  salesController.confirmSalesReturn,
);

router.get(
  "/sales-return/returnable-lines/:saleId",
  requireRole([
    "Senior Accountant",
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Manager",
  ]),
  salesController.getReturnableLines,
);
router.get(
  "/sales-returns/get-sales-returns",
  requireRole([
    "Senior Accountant",
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Manager",
  ]),
  salesController.getSalesReturns,
);

router.post(
  "/sales-return/cancel/:id",
  requireRole([
    "Senior Accountant",
    "POS User",
    "Senior Accountant",
    "Accountant",
    "Manager",
  ]),
  salesController.cancelSalesReturn,
);

// Customers
router.get(
  "/customers",
  requireRole([
    "Senior Accountant",
    "Accountant",
    "POS User",
    "Auditor",
    "Manager",
  ]),
  salesController.getCustomers,
);
// router.get('/customers', authorize('sales.customer.read'), salesController.getCustomers);
router.post(
  "/customers",
  requireRole(["Senior Accountant", "Accountant", "Manager"]),
  auditLogger("CREATE", "CUSTOMER"),
  salesController.createCustomer,
);

router.get("/customers/:id", salesController.getCustomerById);
router.post(
  "/customer-groups",
  requireRole(["Senior Accountant", "Accountant", "POS User", "Manager"]),
  auditLogger("CREATE", "CUSTOMER-GROUP"),
  salesController.createCustomerGroup,
);
router.get(
  "/customer-groups",
  requireRole([
    "Senior Accountant",
    "Accountant",
    "POS User",
    "Auditor",
    "Manager",
  ]),
  salesController.getCustomerGroups,
);
router.put(
  "/customer-groups/:id",
  requireRole([
    "Senior Accountant",
    "Accountant",
    "POS User",
    "Auditor",
    "Manager",
  ]),
  auditLogger("UPDATE", "CUSTOMER-GROUP"),
  salesController.updateCustomerGroup,
);

export default router;
