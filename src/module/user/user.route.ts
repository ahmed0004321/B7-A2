import { Router } from "express";
import { userController } from "./user.controller";

const router = Router();

router.post('/', userController.signUpNewUser)

export const userRoute = router;