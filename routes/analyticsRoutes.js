import express from "express";
import {
  getTodayBookings,
  getTodayRevenue,
  getOccupancyRate,
  getBookingSourceStats,
  getDashboardStats,
  getManagerDashboard,
  getReceptionistDashboard
} from "../controllers/analyticsController.js";
import {protect, authorizeRoles} from "../middleware/authMiddleware.js";

const analyticsRouter = express.Router();

analyticsRouter.get("/today-bookings", getTodayBookings);
analyticsRouter.get("/today-revenue", getTodayRevenue);
analyticsRouter.get("/occupancy", getOccupancyRate);
analyticsRouter.get("/booking-source", getBookingSourceStats);
analyticsRouter.get("/dashboard", getDashboardStats);
analyticsRouter.get("/receptionist", protect, authorizeRoles("RECEPTIONIST"), getReceptionistDashboard);
analyticsRouter.get("/manager", getManagerDashboard);

export default analyticsRouter;