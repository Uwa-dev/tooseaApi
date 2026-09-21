import axios from "axios";
import Booking from "../models/bookingModel.js";
import Payment from "../models/paymentModel.js";

/*
|--------------------------------------------------------------------------
| Initialize Paystack Payment
|--------------------------------------------------------------------------
*/

export const initializePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Don't initialize twice
    const existingPayment = await Payment.findOne({
      booking: booking._id,
      paymentStatus: "PAID",
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Booking has already been paid for.",
      });
    }

    // Unique transaction reference
    const reference = `TOOSEA_${Date.now()}_${booking._id}`;

    // Create payment record
    const payment = await Payment.create({
      booking: booking._id,
      amount: booking.totalPrice,
      paymentMethod: "PAYSTACK",
      paymentStatus: "PENDING",
      transactionReference: reference,
    });

    // Initialize Paystack
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: booking.customer.email,
        amount: booking.totalPrice * 100, // Kobo
        reference,
        callback_url: `${process.env.CLIENT_URL}/payment/verify`,
        metadata: {
          bookingId: booking._id,
          paymentId: payment._id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({
      success: true,
      authorization_url:
        paystackResponse.data.data.authorization_url,
      access_code:
        paystackResponse.data.data.access_code,
      reference,
    });
  } catch (error) {
    console.log(error.response?.data || error);

    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Verify Payment
|--------------------------------------------------------------------------
*/

export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = response.data.data;

    const payment = await Payment.findOne({
      transactionReference: reference,
    }).populate("booking");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    if (paymentData.status === "success") {
      payment.paymentStatus = "PAID";
      await payment.save();

      const booking = await Booking.findById(
        payment.booking._id
      );

      booking.paymentStatus = "PAID";
      booking.bookingStatus = "CONFIRMED";

      await booking.save();

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully.",
        booking,
      });
    }

    payment.paymentStatus = "FAILED";
    await payment.save();

    return res.status(400).json({
      success: false,
      message: "Payment failed.",
    });
  } catch (error) {
    console.log(error.response?.data || error);

    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};