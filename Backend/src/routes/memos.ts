// import express from "express";
// import {
//   createSalesMemo,
//   getSalesMemos,
//   createPurchaseMemo,
//   getPurchaseMemos,
// } from "../controllers/memos";

// import { authenticate,authorize, requireRole} from '../middleware/auth';
// import { auditLogger } from "../middleware/audit";

// const router = express.Router();


// // Apply authentication to all routes
// router.use(authenticate);

// // Sales memos
// router.post("/sales", requireRole(['Accountant', 'Auditor']),auditLogger('CREATE', 'SALES_MEMO'), createSalesMemo);
// router.get("/sales" ,requireRole(['Accountant', 'Auditor']) ,getSalesMemos);

// // Purchase memos
// router.post("/purchase",requireRole(['Accountant', 'Auditor']),auditLogger('CREATE', 'PURCHASE_MEMO'), createPurchaseMemo);
// router.get("/purchase",requireRole(['Accountant', 'Auditor']), getPurchaseMemos);

// export default router;

