import cron from "node-cron";
import Booking from "../models/bookingModel.js";

cron.schedule("0 6 * * *", async () => {
  try {
    const result = await Booking.updateMany(
      {
        bookingStatus: "CHECKED_IN",
        checkOutDate: {
          $lt: new Date(),
        },
      },
      {
        $set: {
          bookingStatus: "EXPIRED",
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
});