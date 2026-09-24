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



// Name: Donald Muc
// Email: donald@gmail.com
// Role: RECEPTIONIST
// Staff Code: REC001
// Password: dUT5utpJFA


//Name: Miracle Imade
//Email: miracle@gmail.com
// Role: Manager
//Password: dIxdG2L4q9

// Name: Chidi Dalu
// Email: chidi@gmail.com
//Role: RECEPTIONIST
// Staff Code: REC003
//Password: FI6ai4pgkr

// Name: Somtochukwu Dalu
// Email: somto@gmail.com
// Role: MANAGER
// Staff Code: MGR003
// Password: 7br8Gg$Cqo