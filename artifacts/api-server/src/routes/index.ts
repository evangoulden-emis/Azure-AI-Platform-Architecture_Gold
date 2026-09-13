import { Router, type IRouter } from "express";
import healthRouter from "./health";
import platformRouter from "./platform";
import governedWorkloadRouter from "./governed-workload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(platformRouter);
router.use(governedWorkloadRouter);

export default router;
