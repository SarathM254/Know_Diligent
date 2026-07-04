import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js'; // Imports our verified Express configuration layout

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/demo';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Successfully connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`🚀 Distribution engine live on local port ${PORT}`);
});