import { Router } from "express";

import { EventsController } from "@/controllers/events-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const eventsRoutes = Router();

const eventsController = new EventsController();

eventsRoutes.use(authenticate);

eventsRoutes.get("/", eventsController.list);
eventsRoutes.post("/", authorize(["admin", "staff"]), eventsController.create);
eventsRoutes.post("/book", authorize(["admin", "resident"]), eventsController.book);

export { eventsRoutes };