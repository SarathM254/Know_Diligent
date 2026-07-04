import Payment from '../models/UpiPayment.js';

// @desc    Submit a payment (Cash or UPI)
// @route   POST /api/upi/salesman/payments
// @access  Private (Salesman only)
export const submitPayment = async (req, res) => {
  const { amount, paymentMode, utr } = req.body;

  try {
    if (!amount || !paymentMode) {
      return res.status(400).json({ success: false, message: 'Please provide amount and payment mode' });
    }

    if (paymentMode === 'upi') {
      if (!utr) {
        return res.status(400).json({ success: false, message: 'UTR number is required for UPI payments' });
      }
      if (!/^\d{5}$/.test(utr)) {
        return res.status(400).json({ success: false, message: 'UTR must be a 5-digit snippet' });
      }

      // Check if UTR is already registered globally
      const utrExists = await Payment.findOne({ utr });
      if (utrExists) {
        return res.status(400).json({ success: false, message: 'This UTR is already active in the system.' });
      }
    }

    // req.user might be an object containing _id or id depending on the middleware
    const salesmanId = (req.user && (req.user._id || req.user.id)) || req.body.salesmanId;

    const payment = await Payment.create({
      salesman: salesmanId,
      amount: Number(amount),
      paymentMode,
      utr: paymentMode === 'upi' ? utr : undefined,
      status: 'pending' // Default starts as pending
    });

    res.status(201).json({
      success: true,
      message: 'Payment logged successfully',
      data: payment
    });
  } catch (error) {
    console.error('Submit Payment Error:', error);
    res.status(500).json({ success: false, message: 'Server error logging payment' });
  }
};

// @desc    Get payment history of the logged-in salesman
// @route   GET /api/upi/salesman/payments
// @access  Private (Salesman only)
export const getMyPayments = async (req, res) => {
  try {
    const salesmanId = req.query.salesmanId || (req.user && (req.user._id || req.user.id));
    const payments = await Payment.find({ salesman: salesmanId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('Get My Payments Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving payments history' });
  }
};

// @desc    Delete a drafted payment
// @route   DELETE /api/upi/salesman/payments/:id
// @access  Private (Salesman only)
export const deletePayment = async (req, res) => {
  try {
    const salesmanId = req.query.salesmanId || (req.user && (req.user._id || req.user.id));
    const payment = await Payment.findOne({ _id: req.params.id, salesman: salesmanId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.isSubmittedToOwner) {
      return res.status(400).json({ success: false, message: 'Cannot delete payments that have already been submitted to the owner' });
    }
    
    await payment.deleteOne();
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete Payment Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting payment' });
  }
};

// @desc    Submit all drafted payments to owner
// @route   POST /api/upi/salesman/payments/submit-all
// @access  Private (Salesman only)
export const submitAllPayments = async (req, res) => {
  try {
    const salesmanId = req.body.salesmanId || (req.user && (req.user._id || req.user.id));
    const result = await Payment.updateMany(
      { salesman: salesmanId, isSubmittedToOwner: false },
      { $set: { isSubmittedToOwner: true } }
    );
    
    res.json({ success: true, message: `Successfully submitted ${result.modifiedCount} payments to owner` });
  } catch (error) {
    console.error('Submit All Payments Error:', error);
    res.status(500).json({ success: false, message: 'Server error submitting payments' });
  }
};
