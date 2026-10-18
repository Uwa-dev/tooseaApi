import dotenv from "dotenv";
dotenv.config({
  path: "../.env"
});

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";



const seedOwner = async () => {
  try {
    await mongoose.connect(process.env.DB);

    const existingOwner = await User.findOne({
      role: "OWNER"
    });

    if (existingOwner) {
      console.log("Owner already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash(
      "owner123",
      10
    );

    const owner = await User.create({
      fullName: "Tobi Agene",
      email: "tooseagarden@gmail.com",
      password: hashedPassword,
      role: "OWNER",
      staffCode: "OWN001"
    });

    console.log("Owner created:", owner);

    process.exit();

  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

seedOwner();

// Name: James Hudson
// Email: james@gmail.com
// Role: RECEPTIONIST
// Staff Code: REC005
// Password: 6egR3evepF

// Name: Dara Mcdonald
// Email: dara@gmail.com
// Role: MANAGER
// Staff Code: MGR005
// Password: 0oKRqgV@VU

// Name: Tonia Ibrahim
// Email: tonia@gmail.com
// Role: RECEPTIONIST
// Staff Code: REC007
// Password: XMQw21RGk@