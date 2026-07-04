import { parseSBIStatement } from '../utils/pdfParser.js';
import Payment from '../models/UpiPayment.js';
import StatementLog from '../models/StatementLog.js';
import VerifiedUtr from '../models/VerifiedUtr.js';

// @desc    Upload SBI bank statement PDF and reconcile payments
// @route   POST /api/upi/owner/reconciliation/upload
// @access  Private (Owner only)
export const reconcileStatement = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF bank statement file' });
    }

    // 1. Parse PDF file buffer
    const parsedTransactions = await parseSBIStatement(req.file.buffer);
    
    if (parsedTransactions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No UPI transactions with 12-digit UTR numbers were found in the uploaded statement PDF.' 
      });
    }

    // 2. Create a statement log record
    const statementLog = await StatementLog.create({
      fileName: req.file.originalname,
      transactionsParsed: parsedTransactions.length
    });

    // 3. Retrieve all pending or unreconciled UPI payments from database for the CURRENT cycle
    const dbPayments = await Payment.find({
      paymentMode: 'upi',
      status: { $in: ['pending', 'unreconciled'] },
      isSubmittedToOwner: true,
      isArchivedByOwner: false
    }).populate('salesman', 'name');

    const matchedPayments = [];
    const mismatchedAmountPayments = [];
    const unmatchedBankTx = [];

    // Group DB payments by their 5-digit UTR for O(1) array lookups
    const dbPaymentsMap = new Map();
    dbPayments.forEach(p => {
      if (p.utr) {
        if (!dbPaymentsMap.has(p.utr)) dbPaymentsMap.set(p.utr, []);
        dbPaymentsMap.get(p.utr).push(p);
      }
    });

    // Track matched payment IDs to identify missing app payments
    const matchedPaymentIds = new Set();
    const verifiedUtrsToCreate = [];

    // 4. Run reconciliation matching
    for (const tx of parsedTransactions) {
      const last5 = tx.utr.slice(-5);
      const possiblePayments = dbPaymentsMap.get(last5);

      if (possiblePayments && possiblePayments.length > 0) {
        // Find the best match (exact amount first)
        let bestMatchIndex = possiblePayments.findIndex(p => p.amount === tx.amount);
        
        // If no exact amount match, just take the first one (mistake case)
        if (bestMatchIndex === -1) {
          bestMatchIndex = 0;
        }

        const paymentRecord = possiblePayments[bestMatchIndex];
        // Remove it from the pool so it doesn't get matched again to a duplicate PDF line
        possiblePayments.splice(bestMatchIndex, 1);

        matchedPaymentIds.add(paymentRecord._id.toString());

        // Verify if amount matches
        if (paymentRecord.amount === tx.amount) {
          paymentRecord.status = 'verified';
          paymentRecord.verifiedAt = new Date();
        } else {
          paymentRecord.status = 'mistake';
          paymentRecord.actualBankAmount = tx.amount;
        }
        paymentRecord.statementRef = statementLog._id;
        await paymentRecord.save();

        if (paymentRecord.status === 'verified') {
          matchedPayments.push({
            paymentId: paymentRecord._id,
            salesman: paymentRecord.salesman?.name || 'Unknown',
            utr: tx.utr,
            amount: tx.amount,
            date: tx.date
          });
          
          verifiedUtrsToCreate.push({
            utrSnippet: last5,
            amount: tx.amount,
            statementDate: tx.date
          });
        } else {
          mismatchedAmountPayments.push({
            paymentId: paymentRecord._id,
            salesman: paymentRecord.salesman?.name || 'Unknown',
            utr: tx.utr,
            appAmount: paymentRecord.amount,
            bankAmount: tx.amount,
            date: tx.date
          });
        }
      } else {
        // No salesman logged this payment yet
        unmatchedBankTx.push({
          utr: tx.utr,
          amount: tx.amount,
          date: tx.date,
          rawLine: tx.rawLine
        });
      }
    }

    // 5. Identify salesman payments in database that were not matched
    const unmatchedAppPayments = [];
    
    for (const p of dbPayments) {
      if (!matchedPaymentIds.has(p._id.toString())) {
        p.status = 'missing';
        p.statementRef = statementLog._id;
        await p.save();
        
        unmatchedAppPayments.push({
          paymentId: p._id,
          salesman: p.salesman?.name || 'Unknown',
          utr: p.utr,
          amount: p.amount,
          createdAt: p.createdAt
        });
      }
    }

    // 6. Update statement stats in database
    statementLog.talliedCount = matchedPayments.length;
    statementLog.unreconciledCount = unmatchedBankTx.length + mismatchedAmountPayments.length;
    await statementLog.save();

    // 7. Store failsafe verified UTRs
    if (verifiedUtrsToCreate.length > 0) {
      await VerifiedUtr.insertMany(verifiedUtrsToCreate);
    }

    res.json({
      success: true,
      message: 'Reconciliation completed successfully',
      data: {
        statementId: statementLog._id,
        summary: {
          totalParsed: parsedTransactions.length,
          matchedCount: matchedPayments.length,
          mismatchedAmountCount: mismatchedAmountPayments.length,
          unclaimedBankTransactionsCount: unmatchedBankTx.length,
          unmatchedAppPaymentsCount: unmatchedAppPayments.length
        },
        reconciled: matchedPayments,
        mismatchedAmount: mismatchedAmountPayments,
        unclaimedBankTransactions: unmatchedBankTx,
        unmatchedAppPayments: unmatchedAppPayments
      }
    });

  } catch (error) {
    console.error('Reconciliation controller error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during reconciliation' });
  }
};

export const getStatementsHistory = async (req, res) => {
  try {
    const statements = await StatementLog.find({})
      .sort({ uploadDate: -1 });

    res.json({
      success: true,
      data: statements
    });
  } catch (error) {
    console.error('Get Statements History Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving statement history' });
  }
};
