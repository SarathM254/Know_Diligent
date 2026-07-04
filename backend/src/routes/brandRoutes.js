import express from 'express';
import multer from 'multer';
import { getBrands, upsertBrand, bulkAddInventory, parseInvoiceWithAI } from '../controllers/brandController.js';
import { verifyOwner } from '../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getBrands);
router.post('/upsert', verifyOwner, upsertBrand);
router.post('/bulk-add', verifyOwner, bulkAddInventory);
router.post('/parse-invoice', verifyOwner, upload.single('invoice'), parseInvoiceWithAI);

export default router;
