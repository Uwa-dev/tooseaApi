import express from "express";
import { 
    createUser, 
    loginUser, 
    getAllUsers, 
    getSingleUser, 
    deleteUser, 
    changePassword,
    getPendingUsers,
    approveUser, 
    rejectUser,
    getApprovedUsers
} from "../controllers/userController.js";
import {protect, authorizeRoles} from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.post("/register", protect, authorizeRoles("OWNER", "MANAGER"), createUser);
userRouter.post("/login", loginUser);
userRouter.get("/staffs", protect, authorizeRoles("OWNER", "MANAGER"), getAllUsers);
userRouter.get("/approved", protect, authorizeRoles("OWNER"), getApprovedUsers);
userRouter.put("/change-password", protect, changePassword);
userRouter.get("/pending", protect, authorizeRoles("OWNER"), getPendingUsers);
userRouter.get("/staff/:id", protect, authorizeRoles("OWNER", "MANAGER"), getSingleUser);
userRouter.delete("/:id", protect, deleteUser);
userRouter.put("/:id/approve", protect, authorizeRoles("OWNER"), approveUser);
userRouter.put("/:id/reject", protect, authorizeRoles("OWNER"), rejectUser);
export default userRouter;