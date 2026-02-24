import { Router } from "express";

const router = Router({ mergeParams: true });

router.get("/", getAllproblems);
router.get("/:problemId");
router.get("/:problemId/status");
router.post("/:problemId/submit");
router.post("/:problemId/run");
router.post("/:problemId/solution");

//admin
router.post("/");
router.patch("/:problemId");
router.delete("/:problemId");

export default router;
