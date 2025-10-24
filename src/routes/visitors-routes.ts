import { Router } from "express";

import { VisitorsController } from "@/controllers/visitors-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const visitorsRoutes = Router();

const visitorsController = new VisitorsController();

visitorsRoutes.use(authenticate, authorize(["admin", "staff"]));

visitorsRoutes.post("/", visitorsController.register);
visitorsRoutes.get("/", visitorsController.list);
visitorsRoutes.post("/:id/exit", visitorsController.exit);

export { visitorsRoutes };