import { Router } from "express";

const router = Router();

router.get("/", getUserHistory);
router.get("/:id", getUserHistoryById); //admin
router.delete("/:id"); //admin

export default router;
