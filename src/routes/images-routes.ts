import { Router } from "express";

import { ImagesController } from "@/controllers/images-controller";
import { authenticate } from "@/middlewares/auth-middlewares";

const imagesRoutes = Router();

const imagesController = new ImagesController();

imagesRoutes.use(authenticate);

imagesRoutes.post("/", imagesController.upload);
imagesRoutes.delete("/", imagesController.remove);

export { imagesRoutes };
