import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getDashboardStats,
  getOwnerDashboardStats
} from "../controllers/dashboardController.js";

const dashboardRouter = express.Router();

dashboardRouter.get("/adminDashboard", protect, authorizeRoles("MANAGER"), getDashboardStats);
dashboardRouter.get("/owner", protect, authorizeRoles("OWNER"), getOwnerDashboardStats)

export default dashboardRouter