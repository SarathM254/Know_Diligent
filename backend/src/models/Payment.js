import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    salesmanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    paymentDate: {
      type: String, 
      required: true
    },
    cashBreakdown: {
      500: { type: Number, default: 0, min: 0 },
      200: { type: Number, default: 0, min: 0 },
      100: { type: Number, default: 0, min: 0 },
      50: { type: Number, default: 0, min: 0 },
      20: { type: Number, default: 0, min: 0 },
      10: { type: Number, default: 0, min: 0 }
    },
    totalHandCash: {
      type: Number,
      default: 0
    },
    changeAmount: {
      type: Number,
      default: 0
    },
    phonePeAmount: {
      type: Number,
      default: 0
    },
    foodAmount: {
      type: Number,
      default: 0
    },
    cigarettesAmount: {
      type: Number,
      default: 0
    },
    totalPayment: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      required: true,
      enum: ["unverified", "verified"],
      default: "unverified"
    }
  },
  { 
    timestamps: true 
  }
);


//restricting the salesman to make only one payment entry per day.

paymentSchema.index({ salesmanId: 1, paymentDate: 1 }, { unique: true });
paymentSchema.index({ status: 1 });

paymentSchema.pre("save", function () {
  const cb = this.cashBreakdown;
  this.totalHandCash = 
    ((cb[500] || 0) * 500) +
    ((cb[200] || 0) * 200) +
    ((cb[100] || 0) * 100) +
    ((cb[50] || 0) * 50) +
    ((cb[20] || 0) * 20) +
    ((cb[10] || 0) * 10) +
    (this.changeAmount || 0);

  this.cigarettesAmount = this.totalHandCash - (this.foodAmount || 0) + (this.phonePeAmount || 0);
  this.totalPayment = this.totalHandCash + (this.phonePeAmount || 0);
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
