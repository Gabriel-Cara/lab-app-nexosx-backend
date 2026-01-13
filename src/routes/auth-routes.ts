import { Router } from "express";

import { AuthController } from "@/controllers/auth-controller";

import { authenticate, authorize } from "@/middlewares/auth-middlewares";
import { UsersController } from "@/controllers/users-controller";
import { StaffInvitesController } from "@/controllers/staff-invites-controller";
import { ResidentInvitesController } from "@/controllers/resident-invites-controller";

const authRoutes = Router();

const authController = new AuthController();
const usersController = new UsersController();
const staffInvitesController = new StaffInvitesController();
const residentInvitesController = new ResidentInvitesController();

authRoutes.post("/login", authController.login);
authRoutes.post("/setup-password", authController.setupPassword);
authRoutes.post("/forgot-password", authController.forgotPassword);
authRoutes.post("/reset-password", authController.resetPassword);
authRoutes.get("/me/:id", authenticate, authController.me);

authRoutes.post("/users", authenticate, authorize(["admin", "staff"]), usersController.create);
authRoutes.post("/users/:id/resend-invite", authenticate, authorize(["admin", "staff"]), usersController.resendInvite);
authRoutes.get("/users", authenticate, authorize(["admin", "staff"]), usersController.list);
authRoutes.put("/users/:id", authenticate, authorize(["admin", "staff"]), usersController.update);
authRoutes.delete("/users/:id", authenticate, authorize(["admin", "staff"]), usersController.delete);

authRoutes.post(
  "/staff-invites",
  authenticate,
  authorize(["admin", "master"]),
  staffInvitesController.create
);
authRoutes.get("/staff-invites/:token", staffInvitesController.show);
authRoutes.post("/staff-signup", staffInvitesController.signUp);

authRoutes.post(
  "/resident-invites",
  authenticate,
  authorize(["admin", "staff"]),
  residentInvitesController.create
);
authRoutes.get("/resident-invites/:token", residentInvitesController.show);
authRoutes.post("/resident-signup", residentInvitesController.signUp);

export { authRoutes };
