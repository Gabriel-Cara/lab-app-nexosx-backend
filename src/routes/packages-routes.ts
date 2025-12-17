import { Router } from "express";

import { PackagesController } from "@/controllers/packages-controller";

import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const packagesRoutes = Router();

const packagesController = new PackagesController();

packagesRoutes.get("/", authenticate, packagesController.list);
packagesRoutes.post("/", authenticate, authorize(["admin", "staff"]) , packagesController.create);
packagesRoutes.patch("/:id/retrieve", authenticate, authorize(["admin", "staff"]) , packagesController.retrieve);
packagesRoutes.patch("/:id/cancel", authenticate, authorize(["admin", "staff"]) , packagesController.cancel);

export { packagesRoutes };
