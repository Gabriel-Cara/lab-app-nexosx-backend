import { Router } from "express";

import { ReservationsController } from "@/controllers/reservations-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const reservationsRoutes = Router();

const reservationsController = new ReservationsController();

reservationsRoutes.use(authenticate);

reservationsRoutes.get("/", reservationsController.list);
reservationsRoutes.post("/", reservationsController.create);
reservationsRoutes.patch("/:id/approve", authorize(["admin", "manager", "doorman"]), reservationsController.approve);
reservationsRoutes.patch("/:id/reject", authorize(["admin", "manager", "doorman"]), reservationsController.reject);
reservationsRoutes.patch("/:id/cancel", authorize(["admin", "manager", "doorman"]), reservationsController.cancel);

export { reservationsRoutes };
