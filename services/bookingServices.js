import Booking from "../models/bookingModel.js";

export const getAllowedBookingConfig = (user) => {
  if (!user) {
    return {
      bookingSource: "ONLINE",
      paymentMethod: "PAYSTACK"
    };
  }

  if (user.role === "RECEPTIONIST") {
    return {
      bookingSource: "WALK_IN",
      paymentMethod: ["CASH", "TRANSFER", "POS"]
    };
  }

  if (user.role === "OWNER" || user.role === "MANAGER") {
    return {
      bookingSource: "WALK_IN",
      paymentMethod: ["CASH", "TRANSFER", "POS"]
    };
  }

  return {
    bookingSource: "ONLINE",
    paymentMethod: "PAYSTACK"
  };
};

export const createOnlineBooking = async (req, res) => {
  try {
    const {
      apartmentId,
      checkInDate,
      checkOutDate,
      customer
    } = req.body;

    // force online rules
    const bookingSource = "ONLINE";
    const paymentMethod = "PAYSTACK";

    // check availability
    const conflict = await Booking.findOne({
      apartment: apartmentId,
      bookingStatus: { $ne: "CANCELLED" },
      checkInDate: { $lt: checkOutDate },
      checkOutDate: { $gt: checkInDate }
    });

    if (conflict) {
      return res.status(400).json({
        message: "Apartment not available"
      });
    }

    const booking = await Booking.create({
      apartment: apartmentId,
      customer,
      checkInDate,
      checkOutDate,
      bookingSource,
      paymentMethod,
      paymentStatus: "PENDING",
      bookingStatus: "PENDING"
    });

    // THEN initialize Paystack
    // (you will add this later)

    res.status(201).json({
      message: "Proceed to payment",
      booking
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createWalkInBooking = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "RECEPTIONIST") {
      return res.status(403).json({
        message: "Only receptionist can create walk-in bookings"
      });
    }

    const {
      apartmentId,
      checkInDate,
      checkOutDate,
      customer,
      paymentMethod
    } = req.body;

    // validate payment method
    if (!["CASH", "TRANSFER", "POS"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method for walk-in"
      });
    }

    // check availability
    const conflict = await Booking.findOne({
      apartment: apartmentId,
      bookingStatus: { $ne: "CANCELLED" },
      checkInDate: { $lt: checkOutDate },
      checkOutDate: { $gt: checkInDate }
    });

    if (conflict) {
      return res.status(400).json({
        message: "Apartment not available"
      });
    }

    const booking = await Booking.create({
      apartment: apartmentId,
      customer,
      checkInDate,
      checkOutDate,
      bookingSource: "WALK_IN",
      paymentMethod,
      paymentStatus: "PAID", // usually immediate or confirmed manually
      bookingStatus: "CONFIRMED"
    });

    res.status(201).json({
      message: "Walk-in booking successful",
      booking
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const checkApartmentAvailability = async (
  apartmentId,
  checkInDate,
  checkOutDate
) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (checkIn >= checkOut) {
    throw new Error(
      "Check-out date must be later than check-in date"
    );
  }

  const conflictingBooking = await Booking.findOne({
    apartment: apartmentId,

    bookingStatus: {
      $nin: ["CANCELLED", "CHECKED_OUT"]
    },

    checkInDate: {
      $lt: checkOut
    },

    checkOutDate: {
      $gt: checkIn
    }
  });

  return {
    available: !conflictingBooking,
    conflictingBooking
  };
};