import { Router } from "express";

import { MasterUsersController } from "@/controllers/master-users-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const masterRoutes = Router();
const masterUsersController = new MasterUsersController();

masterRoutes.use(authenticate, authorize(["master"]));

masterRoutes.get("/users", masterUsersController.list);

export { masterRoutes };
