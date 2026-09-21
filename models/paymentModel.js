import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    paymentMethod: {
      type: String,
      enum: ["PAYSTACK", "CASH", "TRANSFER", "POS"]
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING"
    },

    transactionReference: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true
  }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;