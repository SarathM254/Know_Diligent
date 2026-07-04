import mongoose from "mongoose";

// Sub-schema for individual items to snapshot the brand details at creation time
const billItemSchema = new mongoose.Schema({
  brandId: {
    type: String, // changed from ObjectId
    ref: "Brand",
    required: true
  },
  brandName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, "Quantity cannot be negative"]
  },
  rateSnapShot: {
    type: Number,
    required: true // Captures the exact retail price when the bill is instantiated
  }
});


const billSchema = new mongoose.Schema(
  {
    salesmanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    billingDate: {
      type: String, // Stored explicitly as 'YYYY-MM-DD' for robust local date tracking
      required: true
    },
    items: [billItemSchema], // Array of cigarette brands and quantities
    totalBillValue: {
      type: Number,
      required: true,
      default: 0 // Automatically calculated via middleware or controller before saving
    },
    status: {
      type: String,
      required: true,
      enum: ["draft", "submitted", "delivered", "billed"],
      default: "draft"
    },
    isPushedToNextDay: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true 
  }
);

// Compound Index: Enforces the rule of maximum ONE bill per salesman per calendar day
billSchema.index({ salesmanId: 1, billingDate: 1 }, { unique: true });

// Performance indexes for desk aggregations and history tracking
billSchema.index({ salesmanId: 1, billingDate: -1 });
billSchema.index({ status: 1, billingDate: 1 });

// Pre-save middleware: runs automatically before .save() or .create() executes
billSchema.pre("save", function () {
  // 'this' points directly to the active Bill document being saved
  if (this.items && this.items.length > 0) {
    // Calculate total bill value: sum up (quantity * rateSnapShot) for all rows
    this.totalBillValue = this.items.reduce((sum, item) => {
      return sum + (item.quantity * item.rateSnapShot);
    }, 0);
  } else {
    this.totalBillValue = 0;
  }
});

const Bill = mongoose.model("Bill", billSchema);
export default Bill;