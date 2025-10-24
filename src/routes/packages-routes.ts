import { Router } from "express";

import { PackagesController } from "@/controllers/packages-controller";

import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const packagesRoutes = Router();

const packagesController = new PackagesController();

packagesRoutes.get("/", authenticate, packagesController.list);
packagesRoutes.post("/", authenticate, authorize(["admin", "staff"]) , packagesController.create);
packagesRoutes.post("/:id/retrieve", authenticate, authorize(["admin", "staff"]) , packagesController.retrieve);

export { packagesRoutes };