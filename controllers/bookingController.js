import Booking from "../models/bookingModel.js";
import Apartment from "../models/apartmentModel.js";
import {
  validateCustomer,
  normalizePhone,
} from "../utils/validateCustomer.js";

/* =========================================================
   DATE HELPER
========================================================= */

/*
  All hotel booking dates are DATE-ONLY values.

  Example:
  "2026-07-27" -> 2026-07-27T00:00:00.000Z

  This prevents timezone differences from changing
  the actual check-in/check-out day.
*/
const toDateOnly = (value) => {
  if (!value) return null;

  /*
    Accept:
    YYYY-MM-DD
    YYYY-MM-DDTHH:mm:ss.sssZ
    JavaScript Date objects
  */

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate()
      )
    );
  }

  const valueString = String(value).trim();

  /*
    Extract the YYYY-MM-DD portion.
  */
  const match = valueString.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  /*
    Validate that the date actually exists.

    Example:
    2026-02-31 -> invalid
  */
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};


/* =========================================================
   BOOKING CONFLICT
========================================================= */

/*
  Hotel booking overlap rule:

  Existing booking:
  27 -> 28

  New booking:
  28 -> 29

  This is ALLOWED.

  Why?

  Existing check-in < new check-out
  27 < 29 = true

  Existing check-out > new check-in
  28 > 28 = false

  Therefore: no conflict.

  This is the standard half-open hotel booking interval:
  [checkIn, checkOut)
*/
export const hasBookingConflict = async (
  apartmentId,
  checkInDate,
  checkOutDate
) => {
  const checkIn = toDateOnly(checkInDate);
  const checkOut = toDateOnly(checkOutDate);

  if (!checkIn || !checkOut) {
    throw new Error("Invalid booking dates.");
  }

  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new Error(
      "Check-out date must be after check-in date."
    );
  }

  const conflict = await Booking.findOne({
    apartment: apartmentId,

    bookingStatus: {
      $nin: [
        "CANCELLED",
        "CHECKED_OUT",
        "EXPIRED",
      ],
    },

    checkInDate: {
      $lt: checkOut,
    },

    checkOutDate: {
      $gt: checkIn,
    },
  });

  return conflict;
};


/* =========================================================
   CALCULATE NIGHTS
========================================================= */

export const calculateNights = (
  checkInDate,
  checkOutDate
) => {
  const checkIn = toDateOnly(checkInDate);
  const checkOut = toDateOnly(checkOutDate);

  if (!checkIn || !checkOut) {
    throw new Error("Invalid booking dates.");
  }

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  const nights =
    (checkOut.getTime() - checkIn.getTime()) /
    millisecondsPerDay;

  if (nights <= 0) {
    throw new Error(
      "Check-out date must be after check-in date."
    );
  }

  return nights;
};


/* =========================================================
   CHECK APARTMENT AVAILABILITY
========================================================= */

export const isApartmentAvailable = async (
  apartmentId,
  checkInDate,
  checkOutDate
) => {
  const checkIn = toDateOnly(checkInDate);
  const checkOut = toDateOnly(checkOutDate);

  if (!checkIn || !checkOut) {
    throw new Error("Invalid booking dates.");
  }

  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new Error(
      "Check-out date must be after check-in date."
    );
  }

  const apartment =
    await Apartment.findById(apartmentId);

  if (!apartment) {
    throw new Error("Apartment not found.");
  }

  /*
    Physical apartment conditions.

    IMPORTANT:
    "BOOKED" is NOT checked here.

    Apartment.status represents the apartment's
    CURRENT physical state.

    Future date availability is determined from
    the Booking collection.
  */
  if (
    apartment.status === "MAINTENANCE" ||
    apartment.status === "INACTIVE"
  ) {
    return false;
  }

  if (
    apartment.approvalStatus &&
    apartment.approvalStatus !== "APPROVED"
  ) {
    return false;
  }

  const conflict =
    await hasBookingConflict(
      apartmentId,
      checkIn,
      checkOut
    );

  return !conflict;
};


/* =========================================================
   CREATE ONLINE BOOKING
========================================================= */

export const createOnlineBooking = async (
  req,
  res
) => {
  try {
    const {
      apartmentId,
      customer,
      checkInDate,
      checkOutDate,
    } = req.body;

    if (
      !apartmentId ||
      !checkInDate ||
      !checkOutDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Apartment, check-in date and check-out date are required.",
      });
    }

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Customer information is required.",
      });
    }

    const apartment =
      await Apartment.findById(apartmentId);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found.",
      });
    }

    if (
      apartment.approvalStatus &&
      apartment.approvalStatus !== "APPROVED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This apartment is not approved for booking.",
      });
    }

    if (
      apartment.status === "MAINTENANCE" ||
      apartment.status === "INACTIVE"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This apartment is currently unavailable.",
      });
    }

    const checkIn =
      toDateOnly(checkInDate);

    const checkOut =
      toDateOnly(checkOutDate);

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking dates.",
      });
    }

    if (
      checkOut.getTime() <=
      checkIn.getTime()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Check-out date must be after check-in date.",
      });
    }

    /*
      Backend availability check.

      This is important because frontend availability
      cannot be trusted by itself.
    */
    const conflict =
      await hasBookingConflict(
        apartmentId,
        checkIn,
        checkOut
      );

    if (conflict) {
      return res.status(409).json({
        success: false,
        message:
          "Apartment is already booked for some or all of these dates.",
      });
    }

    const nights =
      calculateNights(
        checkIn,
        checkOut
      );

    const totalPrice =
      nights *
      apartment.pricePerNight;

    const customerData = {
      fullName:
        customer.fullName?.trim(),

      email:
        customer.email
          ? customer.email.trim()
          : null,

      phone:
        customer.phone
          ? normalizePhone(
              customer.phone
            )
          : null,
    };

    validateCustomer(
      customerData
    );

    const booking =
      await Booking.create({
        apartment: apartmentId,

        customer: customerData,

        checkInDate: checkIn,
        checkOutDate: checkOut,

        totalPrice,

        bookingSource: "ONLINE",

        paymentMethod: "PAYSTACK",

        bookingStatus: "PENDING",

        paymentStatus: "PENDING",
      });

    return res.status(201).json({
      success: true,
      booking,
    });

  } catch (error) {
    console.error(
      "Create online booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================================================
   CREATE WALK-IN BOOKING
========================================================= */

export const createWalkInBooking = async (
  req,
  res
) => {
  try {
    /*
      Only receptionists can create walk-in bookings.
    */
    if (
      req.user.role !==
      "RECEPTIONIST"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only receptionists can create walk-in bookings.",
      });
    }

    const {
      apartmentId,
      customer,
      checkInDate,
      checkOutDate,
      paymentMethod,
    } = req.body;

    if (
      !apartmentId ||
      !checkInDate ||
      !checkOutDate ||
      !paymentMethod
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Apartment, dates and payment method are required.",
      });
    }

    if (!customer) {
      return res.status(400).json({
        success: false,
        message:
          "Customer information is required.",
      });
    }

    const apartment =
      await Apartment.findById(
        apartmentId
      );

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message:
          "Apartment not found.",
      });
    }

    if (
      apartment.approvalStatus &&
      apartment.approvalStatus !==
        "APPROVED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This apartment is not approved for booking.",
      });
    }

    if (
      apartment.status ===
        "MAINTENANCE" ||
      apartment.status ===
        "INACTIVE"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This apartment is currently unavailable.",
      });
    }

    const checkIn =
      toDateOnly(checkInDate);

    const checkOut =
      toDateOnly(checkOutDate);

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking dates.",
      });
    }

    if (
      checkOut.getTime() <=
      checkIn.getTime()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Check-out date must be after check-in date.",
      });
    }

    /*
      IMPORTANT:
      The backend checks availability again here.

      This prevents a receptionist from bypassing
      the availability screen by manually sending
      a request for a booked apartment.
    */
    const conflict =
      await hasBookingConflict(
        apartmentId,
        checkIn,
        checkOut
      );

    if (conflict) {
      return res.status(409).json({
        success: false,
        message:
          "Apartment is already booked for some or all of these dates.",
      });
    }

    const nights =
      calculateNights(
        checkIn,
        checkOut
      );

    const totalPrice =
      nights *
      apartment.pricePerNight;

    const customerData = {
      fullName:
        customer.fullName?.trim(),

      email:
        customer.email
          ? customer.email.trim()
          : null,

      phone:
        customer.phone
          ? normalizePhone(
              customer.phone
            )
          : null,
    };

    validateCustomer(
      customerData
    );

    const booking =
      await Booking.create({
        apartment: apartmentId,

        createdBy:
          req.user.id,

        customer:
          customerData,

        checkInDate:
          checkIn,

        checkOutDate:
          checkOut,

        totalPrice,

        bookingSource:
          "WALK_IN",

        paymentMethod,

        paymentStatus:
          "PAID",

        bookingStatus:
          "CONFIRMED",
      });

    return res.status(201).json({
      success: true,

      message:
        "Walk-in booking created successfully.",

      booking,
    });

  } catch (error) {
    console.error(
      "Create walk-in booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================================================
   TODAY'S BOOKINGS
========================================================= */

export const getTodayBookings = async (
  req,
  res
) => {
  try {
    const start =
      new Date();

    start.setHours(
      0,
      0,
      0,
      0
    );

    /*
      Include yesterday because a guest who checked
      in yesterday may still be staying today.
    */
    const previousDay =
      new Date(start);

    previousDay.setDate(
      previousDay.getDate() - 1
    );

    const end =
      new Date();

    end.setHours(
      23,
      59,
      59,
      999
    );

    const bookings =
      await Booking.find({
        checkInDate: {
          $gte: previousDay,
          $lte: end,
        },

        bookingStatus: {
          $in: [
            "PENDING",
            "CONFIRMED",
            "CHECKED_IN",
          ],
        },
      })
        .populate("apartment")
        .sort({
          checkInDate: 1,
        });

    res.status(200).json(
      bookings
    );

  } catch (error) {
    res.status(500).json({
      message:
        error.message,
    });
  }
};


/* =========================================================
   GET ALL BOOKINGS
========================================================= */

export const getAllBookings = async (
  req,
  res
) => {
  try {
    const bookings =
      await Booking.find()
        .populate("apartment")
        .populate(
          "createdBy",
          "fullName email role staffCode"
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json(
      bookings
    );

  } catch (error) {
    res.status(500).json({
      message:
        error.message,
    });
  }
};


/* =========================================================
   GET BOOKING BY ID
========================================================= */

export const getBookingById = async (
  req,
  res
) => {
  try {
    const booking =
      await Booking.findById(
        req.params.id
      )
        .populate("apartment")
        .populate(
          "createdBy",
          "fullName email role staffCode"
        );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};


/* =========================================================
   CHECK IN GUEST
========================================================= */

export const checkInGuest = async (
  req,
  res
) => {
  try {
    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        message:
          "Booking not found",
      });
    }

    if (
      booking.bookingStatus !==
      "CONFIRMED"
    ) {
      return res.status(400).json({
        message:
          "Only confirmed bookings can be checked in.",
      });
    }

    booking.bookingStatus =
      "CHECKED_IN";

    booking.checkedInAt =
      new Date();

    await booking.save();

    /*
      This represents the apartment's CURRENT
      physical state.

      It does not control future availability.
    */
    await Apartment.findByIdAndUpdate(
      booking.apartment,
      {
        status:
          "OCCUPIED",
      }
    );

    res.status(200).json({
      success: true,

      message:
        "Guest checked in successfully.",

      booking,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};


/* =========================================================
   CHECK OUT GUEST
========================================================= */

export const checkOutGuest = async (
  req,
  res
) => {
  try {
    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        message:
          "Booking not found",
      });
    }

    if (
      booking.bookingStatus !==
        "CHECKED_IN" &&
      booking.bookingStatus !==
        "EXPIRED"
    ) {
      return res.status(400).json({
        message:
          "Guest is not currently checked in.",
      });
    }

    booking.bookingStatus =
      "CHECKED_OUT";

    booking.checkedOutAt =
      new Date();

    await booking.save();

    await Apartment.findByIdAndUpdate(
      booking.apartment,
      {
        status:
          "AVAILABLE",
      }
    );

    res.status(200).json({
      success: true,

      message:
        "Guest checked out successfully.",

      booking,
    });

  } catch (error) {
    res.status(500).json({
      message:
        error.message,
    });
  }
};


/* =========================================================
   CANCEL BOOKING
========================================================= */

export const cancelBooking = async (
  req,
  res
) => {
  try {
    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    if (
      booking.bookingStatus ===
        "CHECKED_IN" ||
      booking.bookingStatus ===
        "EXPIRED" ||
      booking.bookingStatus ===
        "CHECKED_OUT"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "This booking cannot be cancelled because the guest has already checked in.",
      });
    }

    if (
      booking.bookingStatus ===
      "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Booking has already been cancelled.",
      });
    }

    booking.bookingStatus =
      "CANCELLED";

    await booking.save();

    /*
      This changes the apartment's current physical
      status only.

      Future bookings are still determined from
      Booking records.
    */
    await Apartment.findByIdAndUpdate(
      booking.apartment,
      {
        status:
          "AVAILABLE",
      }
    );

    res.status(200).json({
      success: true,

      message:
        "Booking cancelled successfully.",

      booking,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};


/* =========================================================
   GET CHECKED-IN GUESTS
========================================================= */

export const getCheckedInGuests =
  async (
    req,
    res
  ) => {
    try {
      const bookings =
        await Booking.find({
          bookingStatus: {
            $in: [
              "CHECKED_IN",
              "EXPIRED",
            ],
          },
        })
          .populate("apartment")
          .sort({
            bookingStatus: -1,
            checkOutDate: 1,
          });

      res.status(200).json({
        success: true,
        bookings,
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };


/* =========================================================
   TRANSFER / EXTEND STAY
========================================================= */

export const transferAndExtendStay =
  async (
    req,
    res
  ) => {
    try {
      const {
        newApartmentId,
        newCheckOutDate,
        paymentMethod,
      } = req.body;

      if (
        !newApartmentId ||
        !newCheckOutDate ||
        !paymentMethod
      ) {
        return res.status(400).json({
          success: false,
          message:
            "New apartment, new check-out date and payment method are required.",
        });
      }

      const booking =
        await Booking.findById(
          req.params.id
        ).populate(
          "apartment"
        );

      if (!booking) {
        return res.status(404).json({
          message:
            "Booking not found",
        });
      }

      if (
        booking.bookingStatus !==
          "CHECKED_IN" &&
        booking.bookingStatus !==
          "EXPIRED"
      ) {
        return res.status(400).json({
          message:
            "Only checked-in or expired guests can be transferred.",
        });
      }

      const newApartment =
        await Apartment.findById(
          newApartmentId
        );

      if (!newApartment) {
        return res.status(404).json({
          message:
            "New apartment not found.",
        });
      }

      if (
        newApartment.approvalStatus &&
        newApartment.approvalStatus !==
          "APPROVED"
      ) {
        return res.status(400).json({
          message:
            "Selected apartment is not approved.",
        });
      }

      if (
        newApartment.status ===
          "MAINTENANCE" ||
        newApartment.status ===
          "INACTIVE"
      ) {
        return res.status(400).json({
          message:
            "Selected apartment is currently unavailable.",
        });
      }

      const newCheckOut =
        toDateOnly(
          newCheckOutDate
        );

      const currentCheckOut =
        toDateOnly(
          booking.checkOutDate
        );

      if (
        !newCheckOut ||
        !currentCheckOut
      ) {
        return res.status(400).json({
          message:
            "Invalid check-out date.",
        });
      }

      if (
        newCheckOut.getTime() <=
        currentCheckOut.getTime()
      ) {
        return res.status(400).json({
          message:
            "New check-out date must be after the current check-out date.",
        });
      }

      /*
        The guest is already checked into the new/current
        apartment situation.

        For a transfer, we only need to make sure the
        NEW apartment has no overlapping booking during
        the period the guest needs it.

        The current guest's stay starts from today/current
        booking context, but the new apartment must be
        available through the new checkout date.
      */

      const transferStart =
        toDateOnly(
          booking.checkInDate
        );

      const conflict =
        await Booking.findOne({
          _id: {
            $ne: booking._id,
          },

          apartment:
            newApartmentId,

          bookingStatus: {
            $nin: [
              "CANCELLED",
              "CHECKED_OUT",
              "EXPIRED",
            ],
          },

          checkInDate: {
            $lt: newCheckOut,
          },

          checkOutDate: {
            $gt: transferStart,
          },
        });

      if (conflict) {
        return res.status(409).json({
          message:
            "Selected apartment already has a booking during the required dates.",
        });
      }

      const extraNights =
        Math.max(
          0,
          Math.round(
            (
              newCheckOut.getTime() -
              currentCheckOut.getTime()
            ) /
            (1000 * 60 * 60 * 24)
          )
        );

      const additionalAmount =
        extraNights *
        newApartment.pricePerNight;

      /*
        Free the old apartment.
      */
      await Apartment.findByIdAndUpdate(
        booking.apartment._id,
        {
          status:
            "AVAILABLE",
        }
      );

      /*
        Mark the new apartment as currently occupied.
      */
      await Apartment.findByIdAndUpdate(
        newApartmentId,
        {
          status:
            "OCCUPIED",
        }
      );

      booking.apartment =
        newApartmentId;

      booking.checkOutDate =
        newCheckOut;

      booking.totalPrice +=
        additionalAmount;

      booking.paymentMethod =
        paymentMethod;

      booking.bookingStatus =
        "CHECKED_IN";

      await booking.save();

      res.status(200).json({
        success: true,

        message:
          "Guest transferred successfully.",

        booking,

        extraNights,

        additionalAmount,
      });

    } catch (error) {
      console.error(
        "Transfer guest error:",
        error
      );

      res.status(500).json({
        message:
          error.message,
      });
    }
  };


/* =========================================================
   MONTHLY BOOKINGS
========================================================= */

export const getMonthlyBookings =
  async (
    req,
    res
  ) => {
    try {
      const {
        year,
        month,
      } = req.query;

      const selectedYear =
        Number(year);

      const selectedMonth =
        Number(month);

      if (
        !selectedYear ||
        !selectedMonth
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Year and month are required.",
        });
      }

      if (
        selectedMonth < 1 ||
        selectedMonth > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Month must be between 1 and 12.",
        });
      }

      const startDate =
        new Date(
          selectedYear,
          selectedMonth - 1,
          1,
          0,
          0,
          0,
          0
        );

      const endDate =
        new Date(
          selectedYear,
          selectedMonth,
          1,
          0,
          0,
          0,
          0
        );

      const bookings =
        await Booking.find({
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        })
          .populate("apartment")
          .populate(
            "createdBy",
            "fullName email role staffCode"
          )
          .sort({
            createdAt: -1,
          });

      res.status(200).json({
        success: true,

        year:
          selectedYear,

        month:
          selectedMonth,

        count:
          bookings.length,

        bookings,
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };


/* =========================================================
   YEARLY BOOKINGS
========================================================= */

export const getYearlyBookings =
  async (
    req,
    res
  ) => {
    try {
      const {
        year,
      } = req.query;

      const selectedYear =
        Number(year);

      if (!selectedYear) {
        return res.status(400).json({
          success: false,
          message:
            "Year is required.",
        });
      }

      const startDate =
        new Date(
          selectedYear,
          0,
          1,
          0,
          0,
          0,
          0
        );

      const endDate =
        new Date(
          selectedYear + 1,
          0,
          1,
          0,
          0,
          0,
          0
        );

      const bookings =
        await Booking.find({
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        })
          .populate("apartment")
          .populate(
            "createdBy",
            "fullName email role staffCode"
          )
          .sort({
            createdAt: -1,
          });

      res.status(200).json({
        success: true,

        year:
          selectedYear,

        count:
          bookings.length,

        bookings,
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };


/* =========================================================
   GET APARTMENT BOOKED DATES
========================================================= */

export const getApartmentBookedDates =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const bookings =
        await Booking.find({
          apartment: id,

          bookingStatus: {
            $in: [
              "PENDING",
              "CONFIRMED",
              "CHECKED_IN",
              "EXPIRED",
            ],
          },
        })
          .select(
            "checkInDate checkOutDate bookingStatus"
          )
          .sort({
            checkInDate: 1,
          });

      res.status(200).json({
        success: true,
        bookings,
      });

    } catch (error) {
      console.error(
        "Error fetching booked dates:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to fetch booked dates.",
      });
    }
  };


/* =========================================================
   GET AVAILABLE APARTMENTS
========================================================= */

export const getAvailableApartments =
  async (
    req,
    res
  ) => {
    try {
      const {
        checkInDate,
        checkOutDate,
      } = req.query;

      if (
        !checkInDate ||
        !checkOutDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Check-in and check-out dates are required.",
        });
      }

      const checkIn =
        toDateOnly(
          checkInDate
        );

      const checkOut =
        toDateOnly(
          checkOutDate
        );

      if (!checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid dates.",
        });
      }

      if (
        checkOut.getTime() <=
        checkIn.getTime()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Check-out date must be after check-in date.",
        });
      }

      /*
        IMPORTANT:

        We do NOT filter by:

          status: "AVAILABLE"

        because status represents the apartment's
        current physical condition.

        An apartment may currently be OCCUPIED but
        still be available for a future date.

        Example:

        Current guest:
        27 -> 28

        New booking:
        28 -> 29

        That apartment must appear.
      */
      const apartments =
        await Apartment.find({
          isActive: true,

          /*
            Only approved apartments can be booked.
          */
          approvalStatus:
            "APPROVED",

          /*
            These physical states genuinely prevent
            the apartment from being offered.
          */
          status: {
            $nin: [
              "MAINTENANCE",
              "INACTIVE",
            ],
          },
        });

      const availableApartments =
        [];

      for (
        const apartment
        of apartments
      ) {
        const conflict =
          await hasBookingConflict(
            apartment._id,
            checkIn,
            checkOut
          );

        if (!conflict) {
          availableApartments.push(
            apartment
          );
        }
      }

      return res.status(200).json({
        success: true,

        apartments:
          availableApartments,
      });

    } catch (error) {
      console.error(
        "Get available apartments error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to find available apartments.",
      });
    }
  };