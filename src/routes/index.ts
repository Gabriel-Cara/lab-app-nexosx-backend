import { Router } from "express";

import { authRoutes } from "./auth-routes";
import { packagesRoutes } from "./packages-routes";
import { visitorsRoutes } from "./visitors-routes";
import { eventsRoutes } from "./events-routes";

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/packages", packagesRoutes);
routes.use("/visitors", visitorsRoutes);
routes.use("events", eventsRoutes);

export { routes };