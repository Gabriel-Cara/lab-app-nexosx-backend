import { Router } from "express";

import { authRoutes } from "./auth-routes";
import { packageRoutes } from "./package-routes";
import { visitorRoutes } from "./visitor-routes";

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/packages", packageRoutes);
routes.use("/visitors", visitorRoutes);

export { routes };