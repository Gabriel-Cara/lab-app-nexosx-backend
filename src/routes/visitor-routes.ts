import { Router } from "express";

import { VisitorController } from "@/controllers/visitor-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const visitorRoutes = Router();

const visitorController = new VisitorController();

visitorRoutes.use(authenticate, authorize(["admin", "staff"]));

visitorRoutes.post("/", visitorController.register);
visitorRoutes.get("/", visitorController.list);
visitorRoutes.post("/:id/exit", visitorController.exit);

export { visitorRoutes };