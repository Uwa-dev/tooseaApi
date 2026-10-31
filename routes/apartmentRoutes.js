
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
  getApprovedApartments,
  approveApartmentUpdate,
  rejectApartmentUpdate,
  getPendingApartmentUpdates,
  getPendingApartmentDeletions,
  approveApartmentDeletion,
  rejectApartmentDeletion,
} from "../controllers/apartmentController.js";

import upload from "../middleware/upload.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const apartmentRouter = express.Router();

// Get all active apartments (public)
apartmentRouter.get("/", getAllApartments);

// Owner and Manager can create apartments
apartmentRouter.post(
  "/",
  protect,
  authorizeRoles("OWNER", "MANAGER"),
  createApartment
);

// Owner reviews apartment creation requests
apartmentRouter.get(
  "/pending",
  protect,
  authorizeRoles("OWNER"),
  getPendingApartments
);

apartmentRouter.get(
  "/approved",
  protect,
  authorizeRoles("OWNER"),
  getApprovedApartments
);

// Owner reviews manager's proposed apartment edits
apartmentRouter.get(
  "/pending-updates",
  protect,
  authorizeRoles("OWNER"),
  getPendingApartmentUpdates
);

// Owner reviews manager's deletion requests
apartmentRouter.get(
  "/pending-deletions",
  protect,
  authorizeRoles("OWNER"),
  getPendingApartmentDeletions
);

// Update apartment:
// OWNER = immediate update
// MANAGER = submits changes for approval
apartmentRouter.put(
  "/:id",
  protect,
  authorizeRoles("OWNER", "MANAGER"),
  updateApartment
);

// Owner approves or rejects proposed edits
apartmentRouter.patch(
  "/:id/approve-update",
  protect,
  authorizeRoles("OWNER"),
  approveApartmentUpdate
);

apartmentRouter.patch(
  "/:id/reject-update",
  protect,
  authorizeRoles("OWNER"),
  rejectApartmentUpdate
);

// Owner approves or rejects apartment deletion requests
apartmentRouter.patch(
  "/:id/approve-deletion",
  protect,
  authorizeRoles("OWNER"),
  approveApartmentDeletion
);

apartmentRouter.patch(
  "/:id/reject-deletion",
  protect,
  authorizeRoles("OWNER"),
  rejectApartmentDeletion
);

// Owner approves or rejects new apartments
apartmentRouter.patch(
  "/:id/approve",
  protect,
  authorizeRoles("OWNER"),
  approveApartment
);

apartmentRouter.patch(
  "/:id/reject",
  protect,
  authorizeRoles("OWNER"),
  rejectApartment
);

// Upload apartment images
apartmentRouter.post(
  "/:id/images",
  protect,
  authorizeRoles("OWNER", "MANAGER"),
  upload.array("images", 15),
  uploadApartmentImages
);

// Delete an apartment image (Owner only)
apartmentRouter.delete(
  "/:id/images/:publicId",
  protect,
  authorizeRoles("OWNER"),
  deleteApartmentImage
);

// Request apartment deletion:
// OWNER = deletes immediately
// MANAGER = submits request for owner approval
apartmentRouter.delete(
  "/:id",
  protect,
  authorizeRoles("OWNER", "MANAGER"),
  deleteApartment
);

// Get a single apartment
apartmentRouter.get("/:id", getApartmentById);

export default apartmentRouter;
