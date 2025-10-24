import { Router } from "express";

import { EventController } from "@/controllers/event-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const eventRoutes = Router();

const eventController = new EventController();

eventRoutes.use(authenticate);

eventRoutes.get("/", eventController.list);
eventRoutes.post("/", authorize(["admin", "staff"]), eventController.create);
eventRoutes.post("/book", authorize(["admin", "resident"]), eventController.book);

export { eventRoutes };