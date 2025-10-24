import { Router } from "express";

import { authRoutes } from "./auth-routes";
import { packageRoutes } from "./package-routes";
import { visitorRoutes } from "./visitor-routes";
import { eventRoutes } from "./event-routes";

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/packages", packageRoutes);
routes.use("/visitors", visitorRoutes);
routes.use("events", eventRoutes);

export { routes };