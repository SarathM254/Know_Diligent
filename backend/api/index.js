import app from '../src/app.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// Serverless handler function container
export default async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log("💾 Serverless Mongoose Session Active.");
    } catch (err) {
      console.error("❌ Serverless database failure:", err);
    }
  }
  return app(req, res);
};
