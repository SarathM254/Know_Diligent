import express from 'express';
import cors from 'cors';
import billRoutes from "./routes/billRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import upiRoutes from "./routes/upiRoutes.js";

const app = express(); 

app.use(cors({
  origin: function(origin, callback) {
    // Allow all origins dynamically to support Vercel deployments
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Mount our operational routes
app.use("/api/bills", billRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/upi", upiRoutes);

app.get('/', (req, res) => {
  res.json({ 
    status: "active", 
    message: "Manikyapriya Agencies backend running smoothly under serverless architecture." 
  });
});

export default app;
