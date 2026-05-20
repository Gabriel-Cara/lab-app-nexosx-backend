import { Router } from "express";

import { BlocksController } from "@/controllers/blocks-controller";
import { authenticate, authorize } from "@/middlewares/auth-middlewares";

const blocksRoutes = Router();
const blocksController = new BlocksController();

blocksRoutes.use(authenticate);

blocksRoutes.get("/", authorize(["admin", "manager"]), blocksController.list);
blocksRoutes.post("/", authorize(["admin", "manager"]), blocksController.create);
blocksRoutes.patch("/:id", authorize(["admin", "manager"]), blocksController.update);
blocksRoutes.delete("/:id", authorize(["admin", "manager"]), blocksController.delete);

export { blocksRoutes };
