import { Router } from "express";

import { ReservationsController } from "@/controllers/reservations-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const reservationsRoutes = Router();

const reservationsController = new ReservationsController();

reservationsRoutes.use(authenticate);

reservationsRoutes.get("/", reservationsController.list);
reservationsRoutes.post("/", reservationsController.create);
reservationsRoutes.patch("/:id/approve", authorize(["admin", "staff"]), reservationsController.approve);
reservationsRoutes.patch("/:id/reject", authorize(["admin", "staff"]), reservationsController.reject);
reservationsRoutes.patch("/:id/cancel", authorize(["admin", "staff"]), reservationsController.cancel);

export { reservationsRoutes };