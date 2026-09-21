import express from "express";

import {
  createApartment,
  getAllApartments,
  getApartmentById,
  updateApartment,
  deleteApartment, 
  uploadApartmentImages,
  deleteApartmentImage,
  getPendingApartments,
  approveApartment,
  rejectApartment,
  getApprovedApartments
} from "../controllers/apartmentController.js";

import upload from "../middleware/upload.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const apartmentRouter = express.Router();

apartmentRouter.get("/", getAllApartments);
apartmentRouter.post("/", protect, authorizeRoles("OWNER", "MANAGER"), createApartment);
apartmentRouter.get("/pending", protect, authorizeRoles("OWNER"), getPendingApartments);
apartmentRouter.get("/approved", protect, authorizeRoles("OWNER"), getApprovedApartments);
apartmentRouter.get("/:id", getApartmentById);
apartmentRouter.patch("/:id/approve", protect, authorizeRoles("OWNER"), approveApartment);
apartmentRouter.patch("/:id/reject", protect, authorizeRoles("OWNER"), rejectApartment);
apartmentRouter.post("/:id/images", protect, authorizeRoles("OWNER"), upload.array("images", 15), uploadApartmentImages);
apartmentRouter.delete("/:id/images/:publicId", protect, authorizeRoles("OWNER"), deleteApartmentImage);
apartmentRouter.patch("/:id", protect, authorizeRoles("OWNER"), updateApartment);
apartmentRouter.delete("/:id", protect, authorizeRoles("OWNER"), deleteApartment);

export default apartmentRouter;
