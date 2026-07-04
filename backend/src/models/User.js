import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true // Automatically cleans up accidental spaces in data entry
    },
    email: {
      type: String,
      required: true,
      unique: true, // Crucial for when you add Google Login later
      lowercase: true
    },
    role: {
      type: String,
      required: true,
      enum: ["owner", "operator", "salesman"] // Restricts values to ONLY these three roles
    },
    salesmanId: {
      type: String,
      default: null, // Stays null for Owner and Operator automatically
      required: function () {                                   
        // arrow functions don't work here because we need access to 'this' context
        // Enforces that if the role is 'salesman', this field CANNOT be empty
        return this.role === "salesman";
      }
    },
    broughtForwardDebt: {
      type: Number,
      default: function() {
        return this.role === "salesman" ? 0 : undefined; 
        // If it's a salesman, initialize to 0. If it's an operator, drop the field entirely!
      }
    }
  },
  {
    timestamps: true // Automatically gives you createdAt and updatedAt
  }
);

userSchema.index({ role: 1, name: 1 });

const User = mongoose.model("User", userSchema);
export default User;