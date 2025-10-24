import { Router } from "express";

import { AuthController } from "@/controllers/auth-controller";

import { authenticate, authorize } from "@/middlewares/auth-middlewares";
import { UsersController } from "@/controllers/users-controller";

const authRoutes = Router();

const authController = new AuthController();
const usersController = new UsersController();

authRoutes.post("/login", authController.login);
authRoutes.get("/me", authenticate, authController.me);

authRoutes.post("/users", authenticate, authorize(["admin", "staff"]), usersController.create);
authRoutes.get("/users", authenticate, authorize(["admin", "staff"]), usersController.list);

export { authRoutes };