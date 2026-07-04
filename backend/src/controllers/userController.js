import User from "../models/User.js";
import LedgerTransaction from "../models/LedgerTransaction.js";
import Bill from "../models/Bill.js";
import Payment from "../models/Payment.js";
import AppSettings from "../models/AppSettings.js";

export const getAllSalesmen = async (req, res) => {
  try {
    return res.status(200).json(await User.find({ role: "salesman" }).sort({ name: 1 }).lean());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSalesmanStatementHistory = async (req, res) => {
  try {
    const { salesmanId } = req.params;
    return res.status(200).json(await LedgerTransaction.find({ salesmanId }).sort({ createdAt: -1 }).lean());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const adjustLedgerBalance = async (req, res) => {
  try {
    const { userId, amount, actionDescription } = req.body;
    if (!userId || amount === undefined) return res.status(400).json({ error: "Mandatory balance params missing." });

    const user = await User.findById(userId);
    if (!user || user.role !== "salesman") return res.status(404).json({ error: "Salesman not found." });

    const adjustmentAmount = Number(amount);
    const oldBF = user.broughtForwardDebt;
    user.broughtForwardDebt += adjustmentAmount;
    await user.save();

    await LedgerTransaction.create({
      salesmanId: user._id,
      type: adjustmentAmount >= 0 ? "manual_add" : "manual_subtract",
      amount: Math.abs(adjustmentAmount),
      description: actionDescription || "Administrative adjustment override",
      previousBF: oldBF,
      newBF: user.broughtForwardDebt
    });

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, role, salesmanId } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: "Input metrics missing." });

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ error: "User profile registration index exists." });

    const newUser = new User({
      name,
      email: email.toLowerCase().trim(),
      role,
      salesmanId: role === 'salesman' ? salesmanId : null
    });

    await newUser.save();
    return res.status(201).json(newUser);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAllOperators = async (req, res) => {
  try {
    return res.status(200).json(await User.find({ role: "operator" }).sort({ name: 1 }).lean());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, salesmanId } = req.body;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase().trim();
    if (role) user.role = role.toLowerCase();
    if (user.role === 'salesman' && salesmanId) user.salesmanId = salesmanId;
    else if (user.role === 'operator') user.salesmanId = null;

    await user.save();
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: "User not found." });
    
    return res.status(200).json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSalesmanDailyStatus = async (req, res) => {
  try {
    const { salesmanId } = req.params;
    let settings = await AppSettings.findOne({ key: "global_config" });
    const operationalDate = settings ? settings.operationalDate : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const bill = await Bill.findOne({ salesmanId, billingDate: operationalDate }).lean();
    const payment = await Payment.findOne({ salesmanId, paymentDate: operationalDate }).lean();
    const user = await User.findById(salesmanId).lean();

    let billStatus = 'Not Submitted';
    if (bill) {
      if (bill.status === 'delivered' || bill.status === 'billed') billStatus = 'Verified';
      else if (bill.status === 'submitted') billStatus = 'Unverified';
    }

    let cashStatus = 'Not Submitted';
    if (payment) {
      if (payment.status === 'verified') cashStatus = 'Verified';
      else if (payment.status === 'unverified') cashStatus = 'Unverified';
    }

    return res.status(200).json({ 
      billStatus, 
      cashStatus,
      bf: user ? (user.broughtForwardDebt || 0) : 0
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
