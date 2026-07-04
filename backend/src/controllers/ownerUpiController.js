import Payment from '../models/UpiPayment.js';
import User from '../models/User.js';
import VerifiedUtr from '../models/VerifiedUtr.js';

// @desc    Get all payments across all salesmen (with filtering)
// @route   GET /api/upi/owner/payments
// @access  Private (Owner only)
export const getAllPayments = async (req, res) => {
  const { status, paymentMode, salesmanId, startDate, endDate } = req.query;

  try {
    let query = { isSubmittedToOwner: true, isDeepArchivedByOwner: { $ne: true } };

    if (status) query.status = status;
    if (paymentMode) query.paymentMode = paymentMode;
    if (salesmanId) query.salesman = salesmanId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('salesman', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    console.error('Get All Payments Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching payments' });
  }
};

// @desc    Manually verify or reconcile a payment (useful for cash or typos)
// @route   PUT /api/upi/owner/payments/:id/verify
// @access  Private (Owner only)
export const verifyPaymentManual = async (req, res) => {
  const { status, utr } = req.body;

  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (utr && payment.paymentMode === 'upi') {
      if (!/^\d{5}$/.test(utr)) {
        return res.status(400).json({ success: false, message: 'UTR must be a 5-digit snippet' });
      }
      
      // If UTR changed, check uniqueness
      if (payment.utr !== utr) {
        const utrExists = await Payment.findOne({ utr, _id: { $ne: payment._id } });
        if (utrExists) {
          return res.status(400).json({ success: false, message: 'This UTR is already registered under another payment' });
        }
        payment.utr = utr;
      }
    }

    payment.status = status || 'verified';
    if (payment.status === 'verified') {
      payment.verifiedAt = new Date();
    } else {
      payment.verifiedAt = undefined;
    }

    await payment.save();

    const updatedPayment = await Payment.findById(payment._id)
      .populate('salesman', 'name email');

    res.json({
      success: true,
      message: `Payment status updated to ${payment.status}`,
      data: updatedPayment
    });
  } catch (error) {
    console.error('Manual Verification Error:', error);
    res.status(500).json({ success: false, message: 'Server error during manual verification' });
  }
};

// @desc    Get dashboard summary statistics
// @route   GET /api/upi/owner/dashboard/stats
// @access  Private (Owner only)
export const getDashboardStats = async (req, res) => {
  try {
    const allPayments = await Payment.find({ isSubmittedToOwner: true, isArchivedByOwner: { $ne: true } });

    const totalPayments = allPayments.length;
    const verifiedPayments = allPayments.filter(p => p.status === 'verified').length;
    const pendingPayments = allPayments.filter(p => p.status === 'pending').length;
    const mistakePayments = allPayments.filter(p => p.status === 'mistake').length;
    const missingPayments = allPayments.filter(p => p.status === 'missing').length;
    const unreconciledPayments = allPayments.filter(p => p.status === 'unreconciled').length;
    const errorPayments = missingPayments + unreconciledPayments;
    
    const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);

    const salesmen = await User.find({ role: 'salesman' }).select('name');
    const salesmenStats = await Promise.all(salesmen.map(async (sm) => {
      const smPayments = await Payment.find({ salesman: sm._id, isSubmittedToOwner: true, isArchivedByOwner: { $ne: true } });
      const verifiedCash = smPayments
        .filter(p => p.paymentMode === 'cash' && p.status === 'verified')
        .reduce((sum, p) => sum + p.amount, 0);
      const verifiedUPI = smPayments
        .filter(p => p.paymentMode === 'upi' && p.status === 'verified')
        .reduce((sum, p) => sum + p.amount, 0);
      const pendingCount = smPayments.filter(p => p.status === 'pending').length;

      return {
        salesmanId: sm._id,
        name: sm.name,
        verifiedCash,
        verifiedUPI,
        totalVerified: verifiedCash + verifiedUPI,
        pendingCount
      };
    }));

    res.json({
      success: true,
      data: {
        totalPayments,
        verifiedPayments,
        pendingPayments,
        mistakePayments,
        errorPayments,
        totalAmount,
        salesmenPerformance: salesmenStats.sort((a, b) => b.totalVerified - a.totalVerified)
      }
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving stats' });
  }
};

// @desc    Archive all current cycle payments (Done for the Day)
// @route   POST /api/upi/owner/payments/archive
// @access  Private (Owner only)
export const archiveAllPayments = async (req, res) => {
  try {
    // Step 1: Push existing "Previous" cycle items into deep archive so they drop off the queue screen
    await Payment.updateMany(
      { isArchivedByOwner: true, isDeepArchivedByOwner: { $ne: true } },
      { $set: { isDeepArchivedByOwner: true } }
    );

    // Step 2: Push current active cycle items into the "Previous" cycle
    const result = await Payment.updateMany(
      { isSubmittedToOwner: true, isArchivedByOwner: { $ne: true } },
      { $set: { isArchivedByOwner: true, archivedAt: new Date() } }
    );
    res.json({ success: true, message: `Archived ${result.modifiedCount} payments.` });
  } catch (error) {
    console.error('Archive Error:', error);
    res.status(500).json({ success: false, message: 'Server error archiving payments' });
  }
};

// @desc    Search for a verified UTR in the failsafe 8-day storage
// @route   GET /api/upi/owner/verified-utrs/search
// @access  Private (Owner only)
export const searchVerifiedUtrs = async (req, res) => {
  const { utr } = req.query;
  
  if (!utr || utr.length !== 5) {
    return res.status(400).json({ success: false, message: 'Please provide a valid 5-digit UTR snippet.' });
  }

  try {
    const results = await VerifiedUtr.find({ utrSnippet: utr }).sort({ createdAt: -1 });
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    console.error('Search Verified UTRs Error:', error);
    res.status(500).json({ success: false, message: 'Server error searching verified UTRs' });
  }
};

// @desc    Manually add a verified UTR record
// @route   POST /api/upi/owner/verified-utrs/manual
// @access  Private (Owner only)
export const addManualVerifiedUtr = async (req, res) => {
  const { utrSnippet, amount, statementDate } = req.body;
  
  if (!utrSnippet || utrSnippet.length !== 5) {
    return res.status(400).json({ success: false, message: 'Please provide a valid 5-digit UTR snippet.' });
  }
  
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid amount.' });
  }

  if (!statementDate) {
    return res.status(400).json({ success: false, message: 'Please provide a statement date.' });
  }

  try {
    const newRecord = await VerifiedUtr.create({
      utrSnippet,
      amount: Number(amount),
      statementDate
    });
    
    res.status(201).json({ success: true, message: 'Manual record added successfully.', data: newRecord });
  } catch (error) {
    console.error('Add Manual Verified UTR Error:', error);
    res.status(500).json({ success: false, message: 'Server error adding manual UTR record' });
  }
};

// @desc    Owner deletes an error payment
// @route   DELETE /api/upi/owner/payments/:id
// @access  Private (Owner only)
export const deletePaymentOwner = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    res.json({ success: true, message: 'Payment successfully deleted' });
  } catch (error) {
    console.error('Owner Delete Payment Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting payment' });
  }
};

// @desc    Owner edits an error payment
// @route   PUT /api/upi/owner/payments/:id
// @access  Private (Owner only)
export const editPaymentOwner = async (req, res) => {
  const { utr, amount } = req.body;
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (utr && payment.paymentMode === 'upi') {
      if (!/^\d{5}$/.test(utr)) {
        return res.status(400).json({ success: false, message: 'UTR must be a 5-digit snippet' });
      }
      
      if (utr !== payment.utr) {
        const utrExists = await Payment.findOne({ utr, _id: { $ne: payment._id } });
        if (utrExists) {
          return res.status(400).json({ success: false, message: 'This UTR is already registered under another payment' });
        }
        payment.utr = utr;
      }
    }

    if (amount) {
      payment.amount = Number(amount);
    }

    // Set status to verified since the owner is explicitly confirming this edit
    payment.status = 'verified';
    payment.verifiedAt = new Date();
    payment.actualBankAmount = undefined; // clear out any mistake tracking
    
    await payment.save();

    res.json({ success: true, message: 'Payment updated successfully', data: payment });
  } catch (error) {
    console.error('Owner Edit Payment Error:', error);
    res.status(500).json({ success: false, message: 'Server error editing payment' });
  }
};
