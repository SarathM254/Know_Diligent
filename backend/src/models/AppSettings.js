import mongoose from "mongoose";

const appSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global_config",
      unique: true
    },
    operationalDate: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

const AppSettings = mongoose.model("AppSettings", appSettingsSchema);
export default AppSettings;
