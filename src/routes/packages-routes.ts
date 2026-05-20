import { Router } from "express";

import { PackagesController } from "@/controllers/packages-controller";

import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const packagesRoutes = Router();

const packagesController = new PackagesController();

packagesRoutes.get("/", authenticate, packagesController.list);
packagesRoutes.post("/", authenticate, authorize(["admin", "manager", "doorman"]) , packagesController.create);
packagesRoutes.post(
  "/:id/resend-code",
  authenticate,
  authorize(["admin", "manager", "doorman"]),
  packagesController.resendCode
);
packagesRoutes.patch("/:id", authenticate, authorize(["admin", "manager", "doorman"]) , packagesController.update);
packagesRoutes.patch("/:id/retrieve", authenticate, authorize(["admin", "manager", "doorman"]) , packagesController.retrieve);
packagesRoutes.patch("/:id/cancel", authenticate, authorize(["admin", "manager", "doorman"]) , packagesController.cancel);
packagesRoutes.delete("/:id", authenticate, authorize(["admin", "manager", "doorman"]) , packagesController.delete);

export { packagesRoutes };
