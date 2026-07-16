import { Router } from "express";
import { MemoController } from "../controllers/memo";
import { authenticate, requireRole } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();
const memoController = new MemoController();

// memo.routes.ts
router.post(
  "/",
  authenticate,
  requireRole(["Senior Accountant"]),
  auditLogger("CREATE", "MEMO"),
  (req, res) => memoController.createMemo(req, res),
);

// New route for reversing a memo
router.post(
  "/:id/reverse",
  authenticate,
  requireRole(["General Manager"]), // Only allow reversal by  General Manager
  auditLogger("REVERSE", "MEMO"),
  (req, res) => memoController.reverseMemo(req, res),
);

router.get(
  "/",
  authenticate,
  requireRole(["Senior Accountant", "Auditor"]),
  auditLogger("READ", "MEMO"),
  (req, res) => memoController.getMemos(req, res),
);

// router.get('/:id', authenticate, requireRole(['Senior Accountant']), auditLogger('READ', 'MEMO'), (req, res) => memoController.getMemo(req, res));

router.patch(
  "/:id",
  authenticate,
  requireRole(["Senior Accountant"]),
  auditLogger("UPDATE", "MEMO"),
  (req, res) => memoController.updateMemo(req, res),
);

router.post(
  "/:id/post",
  authenticate,
  requireRole(["Senior Accountant"]),
  auditLogger("POST", "MEMO"),
  (req, res) => memoController.postMemo(req, res),
);

router.delete(
  "/:id",
  authenticate,
  requireRole(["Senior Accountant"]),
  auditLogger("DELETE", "MEMO"),
  (req, res) => memoController.deleteMemo(req, res),
);

// router.post(
//   '/memos',
//   authenticate,
//   requireRole(['Senior Accountant']),
//   auditLogger('CREATE', 'MEMO'),
//   (req, res) => memoController.createMemo(req, res)
// );

// // import { Router } from 'express';
// // import { MemoController } from '../controllers/memo';
// // import { authenticate, requireRole } from '../middleware/auth';
// // import { auditLogger } from '../middleware/audit';

// // const router = Router();
// // const memoController = new MemoController();

// router.get(
//   '/memos',
//   authenticate,
//   requireRole(['Senior Accountant']),
//   auditLogger('READ', 'MEMO'),
//   (req, res) => memoController.listMemos(req, res)
// );

// router.get(
//   '/memos/:id',
//   authenticate,
//   requireRole(['Senior Accountant']),
//   auditLogger('READ', 'MEMO'),
//   (req, res) => memoController.getMemo(req, res)
// );

// router.patch(
//   '/memos/:id',
//   authenticate,
//   requireRole(['Senior Accountant']),
//   auditLogger('UPDATE', 'MEMO'),
//   (req, res) => memoController.updateMemo(req, res)
// );

// router.post(
//   '/memos/:id/post',
//   authenticate,
//   requireRole(['Senior Accountant']),
//   auditLogger('POST', 'MEMO'),
//   (req, res) => memoController.postMemo(req, res)
// );

// router.delete(
//   '/memos/:id',
//   authenticate,
//   requireRole(['Senior Accountant']),
//   auditLogger('DELETE', 'MEMO'),
//   (req, res) => memoController.deleteMemo(req, res)
// );

export default router;
