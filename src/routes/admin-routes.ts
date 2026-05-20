import { Router } from "express";

import { AdminUsersController } from "@/controllers/admin-users-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const adminRoutes = Router();
const adminUsersController = new AdminUsersController();

adminRoutes.use(authenticate, authorize(["admin"]));

adminRoutes.get("/users", adminUsersController.list);

export { adminRoutes };
