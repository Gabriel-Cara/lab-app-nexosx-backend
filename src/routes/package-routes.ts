import { Router } from "express";

import { PackageController } from "@/controllers/package-controller";

import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const packageRoutes = Router();

const packageController = new PackageController();

packageRoutes.get("/", authenticate, packageController.list);
packageRoutes.post("/", authenticate, authorize(["admin", "staff"]) , packageController.create);
packageRoutes.post("/:id/retrieve", authenticate, authorize(["admin", "staff"]) , packageController.retrieve);

export { packageRoutes };