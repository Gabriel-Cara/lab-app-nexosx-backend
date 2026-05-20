import { Router } from "express";

import { AreasController } from "@/controllers/areas-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const areasRoutes = Router();

const areasController = new AreasController();

areasRoutes.use(authenticate);

areasRoutes.get("/", areasController.list);
areasRoutes.get("/:id", areasController.index);
areasRoutes.get("/:id/slots", areasController.slots);
areasRoutes.get("/:id/slots-range", areasController.slotsRange);
areasRoutes.post("/", authorize(["admin", "manager", "doorman"]), areasController.create);
areasRoutes.patch("/:id", authorize(["admin", "manager", "doorman"]), areasController.update);
areasRoutes.delete("/:id", authorize(["admin", "manager", "doorman"]), areasController.delete);

export { areasRoutes };
