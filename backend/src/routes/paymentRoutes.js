import express from "express";
import { submitDailyPayment, verifyPaymentByOwner, getPendingPaymentsForAdmin } from "../controllers/paymentController.js";
import { verifyOwner } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", submitDailyPayment);
router.patch("/:id/verify", verifyOwner, verifyPaymentByOwner);
router.get("/pending", verifyOwner, getPendingPaymentsForAdmin);

export default router;
