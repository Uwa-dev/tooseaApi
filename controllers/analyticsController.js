import Booking from "../models/bookingModel.js";
import Apartment from "../models/apartmentModel.js";

//******************************* */
//      OWNER ANALYTICS
//******************************* */

//total booking today
export const getTodayBookings = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const total = await Booking.countDocuments({
      createdAt: {
        $gte: start,
        $lte: end
      }
    });

    return res.json({
      success: true,
      totalBookingsToday: total
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//total revenue of paid bookings
export const getTodayRevenue = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const result = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "PAID",
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: "$totalPrice"
          }
        }
      }
    ]);

    return res.json({
      success: true,
      totalRevenueToday:
        result[0]?.totalRevenue || 0
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//Occupancy rate 
//calculated by occupied apartment / total active apartments
export const getOccupancyRate = async (req, res) => {
  try {
    const totalApartments =
      await Apartment.countDocuments({
        isActive: true
      });

    const activeBookings =
      await Booking.countDocuments({
        bookingStatus: {
          $in: ["CONFIRMED", "CHECKED_IN"]
        }
      });

    const occupancyRate =
      totalApartments === 0
        ? 0
        : (activeBookings / totalApartments) * 100;

    return res.json({
      success: true,
      totalApartments,
      activeBookings,
      occupancyRate:
        occupancyRate.toFixed(2) + "%"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//booking source breakdown
export const getBookingSourceStats = async (req, res) => {
  try {
    const result = await Booking.aggregate([
      {
        $group: {
          _id: "$bookingSource",
          count: { $sum: 1 }
        }
      }
    ]);

    const formatted = {
      ONLINE: 0,
      WALK_IN: 0
    };

    result.forEach((item) => {
      formatted[item._id] = item.count;
    });

    return res.json({
      success: true,
      bookingSource: formatted
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//frontend calls one endpoint for the owner instead of the above four.
export const getDashboardStats = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [bookingsToday, revenue, apartments, sourceStats] =
      await Promise.all([
        Booking.countDocuments({
          createdAt: { $gte: start, $lte: end }
        }),

        Booking.aggregate([
          {
            $match: {
              paymentStatus: "PAID",
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPrice" }
            }
          }
        ]),

        Apartment.countDocuments({ isActive: true }),

        Booking.aggregate([
          {
            $group: {
              _id: "$bookingSource",
              count: { $sum: 1 }
            }
          }
        ])
      ]);

    const source = {
      ONLINE: 0,
      WALK_IN: 0
    };

    sourceStats.forEach((s) => {
      source[s._id] = s.count;
    });

    const occupancyRate =
      apartments === 0
        ? 0
        : (bookingsToday / apartments) * 100;

    return res.json({
      success: true,
      data: {
        bookingsToday,
        totalRevenueToday:
          revenue[0]?.total || 0,
        occupancyRate:
          occupancyRate.toFixed(2) + "%",
        totalApartments: apartments,
        bookingSource: source
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//******************************** */
//  RECEPTIONIST ANALYTICS
//******************************** */ 

export const getReceptionistDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // TODAY
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // UPCOMING CHECK-OUTS
    // Today + the next 3 days
    const upcomingDate = new Date(start);
    upcomingDate.setDate(start.getDate() + 3);
    upcomingDate.setHours(23, 59, 59, 999);

    const [
      walkInBookingsToday,
      checkInsToday,
      pendingCheckIns,
      checkOutsToday,
      todayArrivals,
      todayDepartures,
      occupiedApartments,
      availableApartments,
      upcomingCheckouts
    ] = await Promise.all([

      // WALK-IN BOOKINGS CREATED BY THIS RECEPTIONIST TODAY
      Booking.countDocuments({
        bookingSource: "WALK_IN",
        createdBy: userId,
        createdAt: {
          $gte: start,
          $lte: end
        }
      }),

      // GUESTS CHECKED IN TODAY
      Booking.countDocuments({
        bookingStatus: "CHECKED_IN",
        checkedInAt: {
          $gte: start,
          $lte: end
        }
      }),

      // TODAY'S CONFIRMED BOOKINGS THAT HAVE NOT CHECKED IN
      Booking.countDocuments({
        bookingStatus: "CONFIRMED",
        checkInDate: {
          $gte: start,
          $lte: end
        }
      }),

      // GUESTS CHECKED OUT TODAY
      Booking.countDocuments({
        bookingStatus: "CHECKED_OUT",
        checkedOutAt: {
          $gte: start,
          $lte: end
        }
      }),

      // TODAY'S ARRIVALS
      Booking.countDocuments({
        checkInDate: {
          $gte: start,
          $lte: end
        },
        bookingStatus: {
          $in: ["CONFIRMED", "CHECKED_IN"]
        }
      }),

      // TODAY'S DEPARTURES
      Booking.countDocuments({
        checkOutDate: {
          $gte: start,
          $lte: end
        },
        bookingStatus: "CHECKED_IN"
      }),

      // CURRENTLY OCCUPIED
      Apartment.countDocuments({
        isActive: true,
        status: "OCCUPIED"
      }),

      // CURRENTLY AVAILABLE
      Apartment.countDocuments({
        isActive: true,
        status: "AVAILABLE"
      }),

      // UPCOMING CHECK-OUTS
      Booking.find({
        checkOutDate: {
          $gte: start,
          $lte: upcomingDate
        },
        bookingStatus: {
          $in: ["CONFIRMED", "CHECKED_IN"]
        }
      })
        .populate("apartment", "name apartmentCode")
        .sort({ checkOutDate: 1 })
        .limit(10)

    ]);

    return res.status(200).json({
      success: true,
      data: {
        walkInBookingsToday,
        checkInsToday,
        pendingCheckIns,
        checkOutsToday,
        todayArrivals,
        todayDepartures,
        occupiedApartments,
        availableApartments,
        upcomingCheckouts
      }
    });

  } catch (error) {
    console.error(
      "Receptionist dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getManagerDashboard = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [
      bookingsToday,
      checkInsToday,
      checkOutsToday,
      pendingBookings
    ] = await Promise.all([
      Booking.countDocuments({
        createdAt: { $gte: start, $lte: end }
      }),

      Booking.countDocuments({
        bookingStatus: "CHECKED_IN",
        updatedAt: { $gte: start, $lte: end }
      }),

      Booking.countDocuments({
        bookingStatus: "CHECKED_OUT",
        updatedAt: { $gte: start, $lte: end }
      }),

      Booking.countDocuments({
        bookingStatus: "PENDING"
      })
    ]);

    res.json({
      success: true,
      data: {
        bookingsToday,
        checkInsToday,
        checkOutsToday,
        pendingBookings
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};