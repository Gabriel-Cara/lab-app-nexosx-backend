import { Router } from "express";

import { EventsController } from "@/controllers/events-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const eventsRoutes = Router();

const eventsController = new EventsController();

eventsRoutes.use(authenticate);

eventsRoutes.get("/", eventsController.list);
eventsRoutes.get("/:id/bookings", authorize(["admin", "manager", "doorman", "resident"]), eventsController.bookings);
eventsRoutes.post("/", authorize(["admin", "manager", "doorman"]), eventsController.create);
eventsRoutes.patch("/:id", authorize(["admin", "manager", "doorman"]), eventsController.update);
eventsRoutes.delete("/:id", authorize(["admin", "manager", "doorman"]), eventsController.delete);
eventsRoutes.post("/book", authorize(["admin", "manager", "resident"]), eventsController.book);
eventsRoutes.post("/:id/like", authorize(["admin", "manager", "doorman", "resident"]), eventsController.like);
eventsRoutes.delete("/:id/like", authorize(["admin", "manager", "doorman", "resident"]), eventsController.unlike);

export { eventsRoutes };
