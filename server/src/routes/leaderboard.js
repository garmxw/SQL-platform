import { Router } from "express";
import { LeaderBoardController } from "../controllers/LeaderBoard";

const router = Router();

router.get("/", LeaderBoardController);

export default router;
