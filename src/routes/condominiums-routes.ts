import { Router } from "express";

import { CondominiumsController } from "@/controllers/condominiums-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const condominiumsRoutes = Router();

const condominiumsController = new CondominiumsController();

condominiumsRoutes.use(authenticate);

condominiumsRoutes.get("/", authorize(["master"]), condominiumsController.list);
condominiumsRoutes.post("/", authorize(["master"]), condominiumsController.create);

export { condominiumsRoutes };
