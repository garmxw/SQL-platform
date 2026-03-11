import { Router } from "express";

const router = Router();

//user data

router.get("/me"); //navbar

// profile endpoint will return all the stuff needed for the user profile so it will be fast (renders in one request)
router.get("/me/profile");
router.get("/me/progress"); //progress page
router.get("/me/badges"); //badges page
router.get("/me/submissions"); //history
router.get("/me/xp"); //fast XP refresh

//user progression (admin/analytics)
router.get("/:userId");
router.get("/:userId/progress");
router.get("/:userId/lessons");
router.get("/:userId/submissions");

export default router;
