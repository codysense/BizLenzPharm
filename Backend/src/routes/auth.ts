import { Router } from "express";
import { AuthController } from "../controllers/auth";
import { authenticate } from "../middleware/auth";
import { auditLogger } from "../middleware/audit";

const router = Router();
const authController = new AuthController();

router.post("/login", authController.login);
router.post(
  "/register",
  auditLogger("REGISTER", "USER"),
  authController.register,
);
router.post("/refresh", authController.refresh);
router.get("/me", authenticate, authController.me);
router.post(
  "/logout",
  authenticate,
  auditLogger("LOGOUT", "USER"),
  authController.logout,
);

// User management routes (CFO and GM only)
router.get("/users", authenticate, authController.getUsers);
router.post(
  "/users",
  authenticate,
  auditLogger("CREATE_USER", "USER"),
  authController.createUser,
);
router.put(
  "/users/:id",
  authenticate,
  auditLogger("UPDATE_USER", "USER"),
  authController.updateUser,
);
router.patch(
  "/users/:id/status",
  authenticate,
  auditLogger("UPDATE_USER_STATUS", "USER"),
  authController.updateUserStatus,
);
router.get("/roles", authenticate, authController.getRoles);

export default router;
