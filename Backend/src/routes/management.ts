import { Router } from "express";
import { ManagementController } from "../controllers/management";
import { authenticate, authorize, requireRole } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();
const managementController = new ManagementController();

// Apply authentication to all routes
router.use(authenticate);

// Company Settings ( GM only)
router.get("/company", managementController.getCompanySettings);
router.put(
  "/company",
  auditLogger("UPDATE", "COMPANY_SETTINGS"),
  managementController.updateCompanySettings,
);

// System Settings (CFO and GM only)
router.get("/settings", managementController.getSystemSettings);
router.put(
  "/settings",
  auditLogger("UPDATE", "SYSTEM_SETTING"),
  managementController.updateSystemSetting,
);

// Costing Policy (CFO and GM only)
router.get(
  "/costing-policy",
  requireRole(["Senior Accountant", "Auditor"]),
  managementController.getCostingPolicy,
);
router.put(
  "/costing-policy",
  requireRole(["Senior Accountant"]),
  auditLogger("UPDATE", "COSTING_POLICY"),
  managementController.updateCostingPolicy,
);

// Fiscal Calendar (CFO and GM only)
router.get(
  "/fiscal-years",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  managementController.getFiscalYears,
);
router.post(
  "/fiscal-years",
  requireRole(["Senior Accountant"]),
  auditLogger("CREATE", "FISCAL_YEAR"),
  managementController.createFiscalYear,
);
router.get(
  "/fiscal-periods",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  managementController.getFiscalPeriods,
);
router.patch(
  "/fiscal-periods/:id/activate",
  requireRole(["Senior Accountant"]),
  auditLogger("ACTIVATE", "FISCAL_PERIOD"),
  managementController.activateFiscalPeriod,
);
router.patch(
  "/fiscal-periods/:id/close",
  requireRole(["Senior Accountant"]),
  auditLogger("CLOSE", "FISCAL_PERIOD"),
  managementController.closeFiscalPeriod,
);

// Approval Workflows (CFO and GM only)
router.get(
  "/approval-workflows",
  requireRole(["Auditor", "Senior Accountant"]),
  managementController.getApprovalWorkflows,
);
router.post(
  "/approval-workflows",
  requireRole(["Senior Accountant"]),
  auditLogger("CREATE", "APPROVAL_WORKFLOW"),
  managementController.createApprovalWorkflow,
);
router.get(
  "/approval-requests",
  requireRole(["Auditor", "General Manager", "Senior Accountant"]),
  managementController.getApprovalRequests,
);
router.post(
  "/approval-requests/:id/action",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("APPROVAL_ACTION", "APPROVAL_REQUEST"),
  managementController.processApprovalAction,
);

// Enhanced Role Management (CFO and GM only)
router.get(
  "/roles",
  requireRole([
    "Auditor",
    "Senior Accountant",
    "Accountant",
    "POS User",
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Production Manager",
  ]),
  managementController.getRolesWithPermissions,
);
router.post(
  "/roles",
  requireRole(["Senior Accountant"]),
  auditLogger("CREATE", "ROLE"),
  managementController.createRole,
);
router.put(
  "/roles/:id",
  requireRole(["Senior Accountant"]),
  auditLogger("UPDATE", "ROLE"),
  managementController.updateRole,
);
router.delete(
  "/roles/:id",
  requireRole(["Senior Accountant"]),
  auditLogger("DELETE", "ROLE"),
  managementController.deleteRole,
);
router.get(
  "/permissions",
  requireRole(["Senior Accountant"]),
  managementController.getAllPermissions,
);

// Enhanced User Management (CFO and GM only)
router.get(
  "/users",
  requireRole([
    "Senior Accountant",
    "Inventory Manager",
    "Assistant Inventory Manager",
    "Production Manager",
  ]),
  managementController.getUsersWithDetails,
);
router.put(
  "/users/:id/roles",
  requireRole(["General Manager"]),
  auditLogger("UPDATE", "USER_ROLES"),
  managementController.updateUserRoles,
);

// Chart of Accounts Management (CFO and GM only)
router.get(
  "/chart-of-accounts",
  requireRole([
    "Senior Accountant",
    "General Manager",
    "Auditor",
    "Accountant",
  ]),
  managementController.getChartOfAccounts,
);
// router.get('/chart-of-accounts', requireRole('Accountant'), managementController.getChartOfAccounts);
router.post(
  "/chart-of-accounts",
  requireRole(["Senior Accountant"]),
  auditLogger("CREATE", "CHART_ACCOUNT"),
  managementController.createChartAccount,
);
router.put(
  "/chart-of-accounts/:id",
  requireRole(["Senior Accountant"]),
  auditLogger("UPDATE", "CHART_ACCOUNT"),
  managementController.updateChartAccount,
);
router.delete(
  "/chart-of-accounts/:id",
  requireRole(["Senior Accountant"]),
  auditLogger("DELETE", "CHART_ACCOUNT"),
  managementController.deleteChartAccount,
);

// Cash Account Management (CFO and GM only)
router.get(
  "/cash-accounts",
  requireRole([
    "Accountant",
    "Senior Accountant",
    "General Manager",
    "Auditor",
  ]),
  managementController.getCashAccountsManagement,
);
router.post(
  "/cash-accounts",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("CREATE", "CASH_ACCOUNT"),
  managementController.createCashAccountManagement,
);
router.put(
  "/cash-accounts/:id",
  requireRole(["Senior Accountant"]),
  auditLogger("UPDATE", "CASH_ACCOUNT"),
  managementController.updateCashAccountManagement,
);
router.delete(
  "/cash-accounts/:id",
  requireRole(["Senior Accountant"]),
  auditLogger("DELETE", "CASH_ACCOUNT"),
  managementController.deleteCashAccountManagement,
);

// Audit Log Management (GM only)
router.get(
  "/audit-logs",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  managementController.getAuditLogs,
);
export default router;
