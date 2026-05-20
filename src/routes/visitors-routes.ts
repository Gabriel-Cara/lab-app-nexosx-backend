import { Router } from "express";

import { VisitorsController } from "@/controllers/visitors-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const visitorsRoutes = Router();

const visitorsController = new VisitorsController();

visitorsRoutes.use(authenticate);

visitorsRoutes.post("/", authorize(["admin", "manager", "doorman", "resident"]), visitorsController.register);
visitorsRoutes.get("/", authorize(["admin", "manager", "doorman", "resident"]), visitorsController.list);
visitorsRoutes.patch("/:id/entry", authorize(["admin", "manager", "doorman"]), visitorsController.entry);
visitorsRoutes.patch("/:id/exit", authorize(["admin", "manager", "doorman"]), visitorsController.exit);
visitorsRoutes.patch("/:id/approve", authorize(["admin", "manager", "doorman", "resident"]), visitorsController.approve);
visitorsRoutes.patch("/:id/reject", authorize(["admin", "manager", "doorman", "resident"]), visitorsController.reject);

export { visitorsRoutes };
