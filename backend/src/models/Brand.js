import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    categoryId: {
      type: String, // String to match Category _id
      ref: "Category",
      required: true
    },
    wholesalePrice: {
      type: Number,
      required: true,
      min: 0
    },
    retailPrice: {
      type: Number,
      required: true,
      min: 0
    },
    inventoryCount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Inventory cannot fall below zero"]
    }
  },
  { timestamps: true }
);

const Brand = mongoose.model("Brand", brandSchema);
export default Brand;