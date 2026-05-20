import { Router } from "express";

import { authRoutes } from "./auth-routes";
import { packagesRoutes } from "./packages-routes";
import { visitorsRoutes } from "./visitors-routes";
import { eventsRoutes } from "./events-routes";
import { areasRoutes } from "./areas-routes";
import { reservationsRoutes } from "./reservations-routes";
import { imagesRoutes } from "./images-routes";
import { condominiumsRoutes } from "./condominiums-routes";
import { condominiumRequestsRoutes } from "./condominium-requests-routes";
import { adminRoutes } from "./admin-routes";
import { blocksRoutes } from "./blocks-routes";
import { residencesRoutes } from "./residences-routes";

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/packages", packagesRoutes);
routes.use("/visitors", visitorsRoutes);
routes.use("/events", eventsRoutes);
routes.use("/areas", areasRoutes);
routes.use("/reservations", reservationsRoutes);
routes.use("/images", imagesRoutes);
routes.use("/blocks", blocksRoutes);
routes.use("/residences", residencesRoutes);
routes.use("/condominiums", condominiumsRoutes);
routes.use("/condominium-requests", condominiumRequestsRoutes);
routes.use("/admin", adminRoutes);

export { routes };
