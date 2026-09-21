import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import connectDB from "./dbConnection.js";
import bookingRouter from './routes/bookingRoutes.js';
import userRouter from './routes/userRoutes.js';
import apartmentRouter from './routes/apartmentRoutes.js';
import analyticsRouter from "./routes/analyticsRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import "./jobs/updateExpiredBookings.js";

dotenv.config();

const app = express();
connectDB();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const port = 2222;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

app.use("/api/users", userRouter);
app.use("/api/booking", bookingRouter);
app.use('/api/apartment', apartmentRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/dashboard", dashboardRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})