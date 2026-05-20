import { Router } from "express";

import { ResidencesController } from "@/controllers/residences-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const residencesRoutes = Router();
const residencesController = new ResidencesController();

residencesRoutes.use(authenticate);

residencesRoutes.get("/", authorize(["admin", "manager", "doorman", "resident"]), residencesController.list);
residencesRoutes.get("/:id", authorize(["admin", "manager", "doorman", "resident"]), residencesController.index);
residencesRoutes.post("/", authorize(["admin", "manager"]), residencesController.create);
residencesRoutes.patch("/:id", authorize(["admin", "manager"]), residencesController.update);
residencesRoutes.delete("/:id", authorize(["admin", "manager"]), residencesController.delete);

export { residencesRoutes };
