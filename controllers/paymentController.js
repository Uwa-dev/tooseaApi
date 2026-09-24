import axios from "axios";
import crypto from "crypto";
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

    // Don't initialize twice if already paid
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
        amount: booking.totalPrice * 100,
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
      message:
        error.response?.data?.message || error.message,
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

    const booking = await Booking.findById(
      payment.booking._id
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Already Paid
    |--------------------------------------------------------------------------
    */

    if (payment.paymentStatus === "PAID") {
      return res.status(200).json({
        success: true,
        status: "PAID",
        message: "Payment has already been confirmed.",
        booking,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    if (paymentData.status === "success") {
      // Verify amount
      if (paymentData.amount !== booking.totalPrice * 100) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount does not match booking amount.",
        });
      }

      payment.paymentStatus = "PAID";
      await payment.save();

      booking.paymentStatus = "PAID";
      booking.bookingStatus = "CONFIRMED";

      await booking.save();

      return res.status(200).json({
        success: true,
        status: "PAID",
        message: "Payment verified successfully.",
        booking,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | STILL PROCESSING
    |--------------------------------------------------------------------------
    */

    if (
      paymentData.status === "pending" ||
      paymentData.status === "ongoing" ||
      paymentData.status === "processing"
    ) {
      // IMPORTANT:
      // Leave payment as PENDING.
      // Do NOT mark it FAILED.

      return res.status(200).json({
        success: false,
        status: "PENDING",
        message:
          "Payment is still being processed. Please wait for confirmation.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ACTUALLY FAILED
    |--------------------------------------------------------------------------
    */

    if (
      paymentData.status === "failed" ||
      paymentData.status === "abandoned" ||
      paymentData.status === "reversed"
    ) {
      payment.paymentStatus = "FAILED";
      await payment.save();

      return res.status(400).json({
        success: false,
        status: "FAILED",
        message: "Payment was not completed.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | UNKNOWN STATUS
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: false,
      status: "PENDING",
      message:
        "Payment status is still being determined.",
    });
  } catch (error) {
    console.log(error.response?.data || error);

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.message || error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Paystack Webhook
|--------------------------------------------------------------------------
*/

export const paystackWebhook = async (req, res) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Verify Paystack Signature
    |--------------------------------------------------------------------------
    */

    const signature = req.headers["x-paystack-signature"];

    const hash = crypto
      .createHmac(
        "sha512",
        process.env.PAYSTACK_SECRET_KEY
      )
      .update(req.rawBody)
      .digest("hex");

    if (hash !== signature) {
      return res.status(401).json({
        success: false,
        message: "Invalid Paystack signature.",
      });
    }

    const event = req.body;

    /*
    |--------------------------------------------------------------------------
    | Only Handle Successful Charges
    |--------------------------------------------------------------------------
    */

    if (event.event !== "charge.success") {
      return res.status(200).json({
        success: true,
        message: "Event received.",
      });
    }

    const paymentData = event.data;

    const reference = paymentData.reference;

    /*
    |--------------------------------------------------------------------------
    | Find Local Payment
    |--------------------------------------------------------------------------
    */

    const payment = await Payment.findOne({
      transactionReference: reference,
    });

    if (!payment) {
      console.log(
        `Paystack webhook: Payment not found for ${reference}`
      );

      return res.status(200).json({
        success: true,
        message: "Payment not found locally.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Already Paid
    |--------------------------------------------------------------------------
    */

    if (payment.paymentStatus === "PAID") {
      return res.status(200).json({
        success: true,
        message: "Payment already processed.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Booking
    |--------------------------------------------------------------------------
    */

    const booking = await Booking.findById(
      payment.booking
    );

    if (!booking) {
      console.log(
        `Paystack webhook: Booking not found for ${reference}`
      );

      return res.status(200).json({
        success: true,
        message: "Booking not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Amount
    |--------------------------------------------------------------------------
    */

    if (paymentData.amount !== booking.totalPrice * 100) {
      console.log(
        `Paystack webhook: Amount mismatch for ${reference}`
      );

      return res.status(200).json({
        success: true,
        message: "Payment amount mismatch.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Mark Payment as PAID
    |--------------------------------------------------------------------------
    */

    payment.paymentStatus = "PAID";
    await payment.save();

    /*
    |--------------------------------------------------------------------------
    | Confirm Booking
    |--------------------------------------------------------------------------
    */

    booking.paymentStatus = "PAID";
    booking.bookingStatus = "CONFIRMED";

    await booking.save();

    console.log(
      `Paystack payment confirmed: ${reference}`
    );

    return res.status(200).json({
      success: true,
      message: "Payment successfully confirmed.",
    });
  } catch (error) {
    console.error(
      "Paystack webhook error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed.",
    });
  }
};