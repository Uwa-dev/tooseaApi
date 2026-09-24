import express from "express";

import {
  initializePayment,
  verifyPayment,
  paystackWebhook,
} from "../controllers/paymentController.js";

const paymentRouter = express.Router();

paymentRouter.post("/initialize", initializePayment);

paymentRouter.get("/verify/:reference", verifyPayment);

paymentRouter.post("/webhook", paystackWebhook);

export default paymentRouter;