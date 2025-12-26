import { Router } from "express";

import { EventsController } from "@/controllers/events-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const eventsRoutes = Router();

const eventsController = new EventsController();

eventsRoutes.use(authenticate);

eventsRoutes.get("/", eventsController.list);
eventsRoutes.get("/:id/bookings", authorize(["admin", "staff", "resident"]), eventsController.bookings);
eventsRoutes.post("/", authorize(["admin", "staff"]), eventsController.create);
eventsRoutes.patch("/:id", authorize(["admin", "staff"]), eventsController.update);
eventsRoutes.delete("/:id", authorize(["admin", "staff"]), eventsController.delete);
eventsRoutes.post("/book", authorize(["admin", "resident"]), eventsController.book);
eventsRoutes.post("/:id/like", authorize(["admin", "staff", "resident"]), eventsController.like);
eventsRoutes.delete("/:id/like", authorize(["admin", "staff", "resident"]), eventsController.unlike);

export { eventsRoutes };
