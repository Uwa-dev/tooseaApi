import express from "express";
import {
  initializePayment,
  verifyPayment,
} from "../controllers/paymentController.js";

const paymentRouter = express.Router();

paymentRouter.post("/initialize", initializePayment);

paymentRouter.get("/verify/:reference", verifyPayment);

export default paymentRouter;