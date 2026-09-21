import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { generateStaffCode } from "../utils/generateStaffCode.js";

const generatePassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";

  let password = "";

  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};


export const createUser = async (req, res) => {
  try {
    const creator = req.user;

    const { fullName, email, role } = req.body;

    // ----------------------------------
    // BASIC VALIDATION
    // ----------------------------------

    if (!fullName || !email || !role) {
      return res.status(400).json({
        message: "Full name, email and role are required."
      });
    }

    // ----------------------------------
    // ROLE PERMISSIONS
    // ----------------------------------

    // Nobody can create an OWNER
    if (role === "OWNER") {
      return res.status(403).json({
        message: "Owner cannot be created manually."
      });
    }

    // Receptionist cannot create users
    if (creator.role === "RECEPTIONIST") {
      return res.status(403).json({
        message: "Receptionist cannot create users."
      });
    }

    // Manager can ONLY create Receptionists
    if (
      creator.role === "MANAGER" &&
      role !== "RECEPTIONIST"
    ) {
      return res.status(403).json({
        message: "Managers can only create Receptionists."
      });
    }

    // ----------------------------------
    // CHECK EXISTING USER
    // ----------------------------------

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists."
      });
    }

    // ----------------------------------
    // GENERATE STAFF DETAILS
    // ----------------------------------

    const staffCode = await generateStaffCode(role);

    const plainPassword = generatePassword();

    const hashedPassword = await bcrypt.hash(
      plainPassword,
      10
    );

    // ----------------------------------
    // APPROVAL
    // ----------------------------------

    const approvalStatus =
      creator.role === "MANAGER"
        ? "PENDING"
        : "APPROVED";

    // ----------------------------------
    // CREATE USER
    // ----------------------------------

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      staffCode,

      // Newly created staff must change password
      mustChangePassword: true,

      // Manager-created receptionist needs approval
      approvalStatus,

      // Record who created the staff
      createdBy: creator._id
    });

    // ----------------------------------
    // RESPONSE
    // ----------------------------------

    return res.status(201).json({
      message:
        approvalStatus === "PENDING"
          ? "Receptionist created and sent for admin approval."
          : "User created successfully.",

      user: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        staffCode: user.staffCode,
        password: plainPassword,
        approvalStatus: user.approvalStatus
      }
    });

  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      message: error.message
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // CHECK APPROVAL
    if (user.approvalStatus === "PENDING") {
      return res.status(403).json({
        message:
          "Your account is awaiting administrator approval."
      });
    }

    if (user.approvalStatus === "REJECTED") {
      return res.status(403).json({
        message:
          "Your account has been rejected by the administrator."
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        staffCode: user.staffCode
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        staffCode: user.staffCode,
        mustChangePassword: user.mustChangePassword,
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Login error",
      error: error.message
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All password fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New passwords do not match.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Verify current/system-generated password
    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is incorrect.",
      });
    }

    // Prevent using the same password
    const samePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (samePassword) {
      return res.status(400).json({
        message: "New password must be different from your current password.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    user.password = hashedPassword;
    user.mustChangePassword = false;

    await user.save();

    res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    let users;

    if (req.user.role === "OWNER") {
      users = await User.find()
        .select("-password")
        .sort({ createdAt: -1 });
    } else if (req.user.role === "MANAGER") {
      users = await User.find({
        role: "RECEPTIONIST"
      })
        .select("-password")
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view users."
      });
    }

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getSingleUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Staff not found."
      });
    }

    // OWNER can view anyone
    if (req.user.role === "OWNER") {
      return res.status(200).json({
        success: true,
        user
      });
    }

    // MANAGER can only view receptionists
    if (req.user.role === "MANAGER") {
      if (user.role !== "RECEPTIONIST") {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this staff."
        });
      }

      return res.status(200).json({
        success: true,
        user
      });
    }

    return res.status(403).json({
      success: false,
      message: "Access denied."
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({
      approvalStatus: "PENDING"
    })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending users."
    });
  }
};

export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    if (user.approvalStatus !== "PENDING") {
      return res.status(400).json({
        message: "This user does not require approval."
      });
    }

    user.approvalStatus = "APPROVED";

    await user.save();

    return res.status(200).json({
      message: "Staff account approved successfully."
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};

export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (user.approvalStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending users can be rejected."
      });
    }

    // Reject and permanently delete the account
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Staff account rejected and deleted successfully."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject staff account."
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const requester = req.user;
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ OWNER cannot be deleted
    if (user.role === "OWNER") {
      return res.status(403).json({
        message: "Owner account cannot be deleted"
      });
    }

    // ❌ Receptionist cannot delete anyone
    if (requester.role === "RECEPTIONIST") {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    // MANAGER can only delete receptionist
    if (
      requester.role === "MANAGER" &&
      user.role !== "RECEPTIONIST"
    ) {
      return res.status(403).json({
        message: "Manager can only delete receptionists"
      });
    }

    // OWNER can delete manager + receptionist
    if (
      requester.role === "OWNER"
    ) {
      await User.findByIdAndDelete(userId);
      return res.json({ message: "User deleted successfully" });
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getApprovedUsers = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can view approved users."
      });
    }

    const users = await User.find({
      approvalStatus: "APPROVED"
    })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch approved users."
    });
  }
};