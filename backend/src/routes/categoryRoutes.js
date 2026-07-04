import express from 'express';
import { getCategories, createCategory } from '../controllers/categoryController.js';
import { verifyOwner } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.get('/', getCategories);
router.post('/', verifyOwner, createCategory);

export default router;
