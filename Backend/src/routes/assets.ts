import { Router } from "express";
import { AssetsController } from "../controllers/assets";
import { authenticate, authorize, requireRole } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();
const assetsController = new AssetsController();

// Apply authentication to all routes
router.use(authenticate);

// Asset Categories (CFO and GM only)
router.get(
  "/categories",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  assetsController.getAssetCategories,
);
router.post(
  "/categories",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("CREATE", "ASSET_CATEGORY"),
  assetsController.createAssetCategory,
);
router.put(
  "/categories/:id",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("UPDATE", "ASSET_CATEGORY"),
  assetsController.updateAssetCategory,
);
router.delete(
  "/categories/:id",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("DELETE", "ASSET_CATEGORY"),
  assetsController.deleteAssetCategory,
);

// Assets
router.get(
  "/",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  assetsController.getAssets,
);
router.post(
  "/",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("CREATE", "ASSET"),
  assetsController.createAsset,
);
router.put(
  "/:id",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("UPDATE", "ASSET"),
  assetsController.updateAsset,
);
router.delete(
  "/:id",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("DELETE", "ASSET"),
  assetsController.deleteAsset,
);

// Capitalization
router.get(
  "/purchase-orders",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  assetsController.getPurchaseOrdersForCapitalization,
);
router.post(
  "/capitalize",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("CAPITALIZE", "ASSET"),
  assetsController.capitalizeFromPurchase,
);

// Depreciation
router.post(
  "/depreciation/run",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("RUN_DEPRECIATION", "ASSET"),
  assetsController.runDepreciation,
);
router.get(
  "/:id/depreciation",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  assetsController.getDepreciationSchedule,
);

// Disposal
router.post(
  "/:id/dispose",
  requireRole(["General Manager", "Senior Accountant"]),
  auditLogger("DISPOSE", "ASSET"),
  assetsController.disposeAsset,
);
// Reports
router.get(
  "/register",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  assetsController.getAssetRegister,
);
router.get(
  "/valuation",
  requireRole(["General Manager", "Senior Accountant", "Auditor"]),
  assetsController.getAssetValuation,
);

export default router;
