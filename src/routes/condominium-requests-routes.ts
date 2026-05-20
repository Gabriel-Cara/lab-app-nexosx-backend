import { Router } from "express";

import { CondominiumRequestsController } from "@/controllers/condominium-requests-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const condominiumRequestsRoutes = Router();
const condominiumRequestsController = new CondominiumRequestsController();

condominiumRequestsRoutes.post("/", condominiumRequestsController.create);

condominiumRequestsRoutes.get(
  "/",
  authenticate,
  authorize(["admin"]),
  condominiumRequestsController.list
);
condominiumRequestsRoutes.patch(
  "/:id/approve",
  authenticate,
  authorize(["admin"]),
  condominiumRequestsController.approve
);
condominiumRequestsRoutes.patch(
  "/:id/reject",
  authenticate,
  authorize(["admin"]),
  condominiumRequestsController.reject
);

export { condominiumRequestsRoutes };
