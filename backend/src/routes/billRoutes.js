import express from 'express';
import {
  createOrUpdateDraftBill,
  submitBill,
  updateBillStatusByOwner,
  getSalesmanBillHistory,
  getPendingBillsForAdmin,
  pushGlobalSystemDate,
  getGlobalSystemDate,
  getDashboardStats
} from '../controllers/billController.js';
import { verifyOwner, verifyOwnerOrOperator } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', createOrUpdateDraftBill);
router.get('/global-date', getGlobalSystemDate);
router.get('/dashboard-stats', verifyOwner, getDashboardStats);
router.post('/global-push-date', verifyOwner, pushGlobalSystemDate);
router.patch('/:id/submit', submitBill);
router.patch('/:id/status', verifyOwnerOrOperator, updateBillStatusByOwner);
router.get('/history/:salesmanId', getSalesmanBillHistory);
router.get('/admin/pending', verifyOwnerOrOperator, getPendingBillsForAdmin);

export default router;
