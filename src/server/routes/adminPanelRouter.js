import { Router } from "express";

const router = Router();

router.get("/users");
router.get("/users/:id");
router.get("/users/:id/role");
router.get("/users/:id/xp");

// the CRUD stuff you'll find them om thier routers, e.g: to add/delete/patch a track that api is on tracksRouter.js

export default router;
