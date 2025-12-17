import { Router } from "express";

import { VisitorsController } from "@/controllers/visitors-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const visitorsRoutes = Router();

const visitorsController = new VisitorsController();

visitorsRoutes.use(authenticate);

visitorsRoutes.post("/", authorize(["admin", "staff", "resident"]), visitorsController.register);
visitorsRoutes.get("/", authorize(["admin", "staff", "resident"]), visitorsController.list);
visitorsRoutes.patch("/:id/entry", authorize(["admin", "staff"]), visitorsController.entry);
visitorsRoutes.patch("/:id/exit", authorize(["admin", "staff"]), visitorsController.exit);
visitorsRoutes.patch("/:id/approve", authorize(["admin", "staff", "resident"]), visitorsController.approve);
visitorsRoutes.patch("/:id/reject", authorize(["admin", "staff", "resident"]), visitorsController.reject);

export { visitorsRoutes };
