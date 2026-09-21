import Apartment from "../models/apartmentModel.js";
import Booking from "../models/bookingModel.js";
import User from "../models/userModel.js";

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();

    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(
      startOfTomorrow.getDate() + 1
    );

    // -----------------------------
    // MONTH
    // -----------------------------

    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const startOfNextMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1
    );

    // -----------------------------
    // APARTMENTS
    // -----------------------------

    const totalApartments =
      await Apartment.countDocuments({
        approvalStatus: "APPROVED",
      });

    const availableApartments =
      await Apartment.countDocuments({
        approvalStatus: "APPROVED",
        isActive: true,
        status: "AVAILABLE",
      });

    const occupiedApartments =
      await Apartment.countDocuments({
        approvalStatus: "APPROVED",
        isActive: true,
        status: "OCCUPIED",
      });

    const bookedApartments =
      await Apartment.countDocuments({
        approvalStatus: "APPROVED",
        isActive: true,
        status: "BOOKED",
      });

    const maintenanceApartments =
      await Apartment.countDocuments({
        approvalStatus: "APPROVED",
        isActive: true,
        status: "MAINTENANCE",
      });

    // -----------------------------
    // BOOKINGS TODAY
    // -----------------------------

    const todayBookings =
      await Booking.countDocuments({
        createdAt: {
          $gte: startOfToday,
          $lt: startOfTomorrow,
        },
      });

    // -----------------------------
    // TODAY'S CHECK-INS
    // -----------------------------

    const todayCheckIns =
      await Booking.countDocuments({
        checkInDate: {
          $gte: startOfToday,
          $lt: startOfTomorrow,
        },

        bookingStatus: {
          $in: [
            "PENDING",
            "CONFIRMED",
          ],
        },
      });

    // -----------------------------
    // TODAY'S CHECK-OUTS
    // -----------------------------

    const todayCheckOuts =
      await Booking.countDocuments({
        checkOutDate: {
          $gte: startOfToday,
          $lt: startOfTomorrow,
        },

        bookingStatus: {
          $in: [
            "CONFIRMED",
            "CHECKED_IN",
            "EXPIRED",
          ],
        },
      });

    // -----------------------------
    // CURRENTLY CHECKED IN
    // -----------------------------

    const checkedInGuests =
      await Booking.countDocuments({
        bookingStatus: {
          $in: [
            "CHECKED_IN",
            "EXPIRED",
          ],
        },
      });

    // -----------------------------
    // PENDING ONLINE BOOKINGS
    // -----------------------------

    const pendingBookings =
      await Booking.countDocuments({
        bookingStatus: "PENDING",
      });

    // -----------------------------
    // MONTHLY REVENUE
    // -----------------------------

    const revenue =
      await Booking.aggregate([
        {
          $match: {
            paymentStatus: "PAID",

            createdAt: {
              $gte: startOfMonth,
              $lt: startOfNextMonth,
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: "$totalPrice",
            },
          },
        },
      ]);

    const monthlyRevenue =
      revenue.length > 0
        ? revenue[0].total
        : 0;

    // -----------------------------
    // BOOKING SOURCES
    // -----------------------------

    const onlineBookings =
      await Booking.countDocuments({
        bookingSource: "ONLINE",

        createdAt: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      });

    const walkInBookings =
      await Booking.countDocuments({
        bookingSource: "WALK_IN",

        createdAt: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      });

    // -----------------------------
    // STAFF
    // -----------------------------

    const totalStaff =
      await User.countDocuments({
        role: {
          $in: [
            "MANAGER",
            "RECEPTIONIST",
          ],
        },
      });

    // -----------------------------
    // RESPONSE
    // -----------------------------

    res.status(200).json({
      success: true,

      dashboard: {
        apartments: {
          total: totalApartments,
          available: availableApartments,
          occupied: occupiedApartments,
          booked: bookedApartments,
          maintenance: maintenanceApartments,
        },

        bookings: {
          today: todayBookings,
          checkInsToday: todayCheckIns,
          checkOutsToday: todayCheckOuts,
          checkedIn: checkedInGuests,
          pending: pendingBookings,
        },

        revenue: {
          monthly: monthlyRevenue,
        },

        bookingSources: {
          online: onlineBookings,
          walkIn: walkInBookings,
        },

        staff: {
          total: totalStaff,
        },
      },
    });

  } catch (error) {
    console.error(
      "Dashboard Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOwnerDashboardStats = async (req, res) => {
  try {
    // ==============================
    // DATE RANGES
    // ==============================

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // First day of current month
    const firstDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    // ==============================
    // DASHBOARD STATISTICS
    // ==============================

    const [
      totalApartments,
      availableApartments,
      occupiedApartments,
      maintenanceApartments,
      totalStaff,
      todayBookings,
      allBookings,
      pendingBookings,
      onlineBookings,
      walkInBookings,
      totalRevenue,
      monthlyRevenue
    ] = await Promise.all([

      // TOTAL APPROVED APARTMENTS
      Apartment.countDocuments({
        approvalStatus: "APPROVED"
      }),

      // AVAILABLE APARTMENTS
      Apartment.countDocuments({
        approvalStatus: "APPROVED",
        isActive: true,
        status: "AVAILABLE"
      }),

      // OCCUPIED APARTMENTS
      Apartment.countDocuments({
        approvalStatus: "APPROVED",
        isActive: true,
        status: "OCCUPIED"
      }),

      // MAINTENANCE APARTMENTS
      Apartment.countDocuments({
        approvalStatus: "APPROVED",
        status: "MAINTENANCE"
      }),

      // TOTAL STAFF
      User.countDocuments({
        role: {
          $in: ["MANAGER", "RECEPTIONIST"]
        }
      }),

      // TODAY'S BOOKINGS
      Booking.countDocuments({
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      }),

      // ALL BOOKINGS
      Booking.countDocuments(),

      // PENDING BOOKINGS
      Booking.countDocuments({
        bookingStatus: "PENDING"
      }),

      // ONLINE BOOKINGS
      Booking.countDocuments({
        bookingSource: "ONLINE"
      }),

      // WALK-IN BOOKINGS
      Booking.countDocuments({
        bookingSource: "WALK_IN"
      }),

      // TOTAL REVENUE
      Booking.aggregate([
        {
          $match: {
            paymentStatus: "PAID"
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalPrice"
            }
          }
        }
      ]),

      // REVENUE THIS MONTH
      Booking.aggregate([
        {
          $match: {
            paymentStatus: "PAID",
            createdAt: {
              $gte: firstDayOfMonth
            }
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalPrice"
            }
          }
        }
      ])

    ]);

    // ==============================
    // EXTRACT REVENUE VALUES
    // ==============================

    const totalRevenueAmount =
      totalRevenue.length > 0
        ? totalRevenue[0].total
        : 0;

    const monthlyRevenueAmount =
      monthlyRevenue.length > 0
        ? monthlyRevenue[0].total
        : 0;

    // ==============================
    // RESPONSE
    // ==============================

    return res.status(200).json({
      success: true,

      dashboard: {
        apartments: {
          total: totalApartments,
          available: availableApartments,
          occupied: occupiedApartments,
          maintenance: maintenanceApartments
        },

        bookings: {
          today: todayBookings,
          all: allBookings,
          pending: pendingBookings
        },

        bookingSources: {
          online: onlineBookings,
          walkIn: walkInBookings
        },

        revenue: {
          total: totalRevenueAmount,
          monthly: monthlyRevenueAmount
        },

        staff: {
          total: totalStaff
        }
      }
    });

  } catch (error) {
    console.error(
      "Owner dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};