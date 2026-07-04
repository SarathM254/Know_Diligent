import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    }
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
