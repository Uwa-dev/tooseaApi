import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      fullName: {
        type: String,
        required: true,
        trim: true
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null
      },

      phone: {
        type: String,
        trim: true,
        default: null
      }
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true
    },

    checkInDate: {
      type: Date,
      required: true
    },

    checkOutDate: {
      type: Date,
      required: true
    },

    totalPrice: {
      type: Number,
      required: true
    },

    bookingStatus: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "CHECKED_IN",
        "CHECKED_OUT",
        "EXPIRED",
        "CANCELLED"
      ],
      default: "PENDING"
    },

    checkedInAt: {
      type: Date,
      default: null
    },

    checkedOutAt: {
      type: Date,
      default: null
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING"
    },

    bookingSource: {
      type: String,
      enum: ["ONLINE", "WALK_IN"],
      required: true
    },

    paymentMethod: {
      type: String,
      enum: ["PAYSTACK", "CASH", "TRANSFER", "POS"],
      required: true
    },

    paymentReference: String
  },
  {
    timestamps: true
  }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;