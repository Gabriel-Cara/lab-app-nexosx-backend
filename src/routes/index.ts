import { Router } from "express";
import { authRoutes } from "./auth-routes";
import { packageRoutes } from "./package-routes";

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/package", packageRoutes);

export { routes };