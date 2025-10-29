import { Router } from "express";

import { AreasController } from "@/controllers/areas-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const areasRoutes = Router();

const areasController = new AreasController();

areasRoutes.use(authenticate);

areasRoutes.get("/", areasController.list);
areasRoutes.post("/", authorize(["admin", "staff"]), areasController.create);
areasRoutes.put("/:id", authorize(["admin", "staff"]), areasController.update);
areasRoutes.delete("/:id", authorize(["admin", "staff"]), areasController.delete);

export { areasRoutes };
