import { Router } from "express";

import { AuthController } from "@/controllers/auth-controller";

import { authenticate, authorize } from "@/middlewares/auth-middlewares";
import { UserController } from "@/controllers/user-controller";

const authRoutes = Router();

const authController = new AuthController();
const userController = new UserController();

authRoutes.post("/login", authController.login);
authRoutes.get("/me", authenticate, authController.me);

authRoutes.post("/users", authenticate, authorize(["admin", "staff"]), userController.create);
authRoutes.get("/users", authenticate, authorize(["admin", "staff"]), userController.list);

export { authRoutes };