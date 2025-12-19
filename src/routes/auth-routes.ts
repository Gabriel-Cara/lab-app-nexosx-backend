import { Router } from "express";

import { AuthController } from "@/controllers/auth-controller";

import { authenticate, authorize } from "@/middlewares/auth-middlewares";
import { UsersController } from "@/controllers/users-controller";

const authRoutes = Router();

const authController = new AuthController();
const usersController = new UsersController();

authRoutes.post("/login", authController.login);
authRoutes.post("/setup-password", authController.setupPassword);
authRoutes.get("/me/:id", authenticate, authController.me);

authRoutes.post("/users", authenticate, authorize(["admin", "staff"]), usersController.create);
authRoutes.post("/users/:id/resend-invite", authenticate, authorize(["admin", "staff"]), usersController.resendInvite);
authRoutes.get("/users", authenticate, authorize(["admin", "staff"]), usersController.list);
authRoutes.put("/users/:id", authenticate, authorize(["admin", "staff"]), usersController.update);
authRoutes.delete("/users/:id", authenticate, authorize(["admin", "staff"]), usersController.delete);

export { authRoutes };
