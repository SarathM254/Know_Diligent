import express from 'express';
import multer from 'multer';
import { submitPayment, getMyPayments, deletePayment, submitAllPayments } from '../controllers/salesmanUpiController.js';
import { getAllPayments, verifyPaymentManual, getDashboardStats, archiveAllPayments, searchVerifiedUtrs, addManualVerifiedUtr, deletePaymentOwner, editPaymentOwner } from '../controllers/ownerUpiController.js';
import { reconcileStatement, getStatementsHistory } from '../controllers/reconciliationController.js';

// If Diligent has auth middleware, you would import it here.
// e.g., import { protect, authorize } from '../middlewares/authMiddleware.js';
import { verifyOwner, verifySalesman } from '../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Salesman Routes ---
// Base: /api/upi/salesman
router.post('/salesman/payments', verifySalesman, submitPayment);
router.get('/salesman/payments', verifySalesman, getMyPayments);
router.delete('/salesman/payments/:id', verifySalesman, deletePayment);
router.post('/salesman/payments/submit-all', verifySalesman, submitAllPayments);

// --- Owner Routes ---
// Base: /api/upi/owner
router.get('/owner/payments', verifyOwner, getAllPayments);
router.put('/owner/payments/:id/verify', verifyOwner, verifyPaymentManual);
router.delete('/owner/payments/:id', verifyOwner, deletePaymentOwner);
router.put('/owner/payments/:id', verifyOwner, editPaymentOwner);
router.get('/owner/dashboard/stats', verifyOwner, getDashboardStats);
router.post('/owner/payments/archive', verifyOwner, archiveAllPayments);
router.get('/owner/verified-utrs/search', verifyOwner, searchVerifiedUtrs);
router.post('/owner/verified-utrs/manual', verifyOwner, addManualVerifiedUtr);

// --- Reconciliation (Owner) ---
router.post('/owner/reconciliation/upload', verifyOwner, upload.single('statement'), reconcileStatement);
router.get('/owner/reconciliation/statements', verifyOwner, getStatementsHistory);

export default router;
