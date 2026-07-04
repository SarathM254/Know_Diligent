import express from 'express';
import { verifyOwnerPIN, googleLogin, demoLogin } from '../controllers/authController.js';

const router = express.Router();

router.post('/verify-owner', verifyOwnerPIN);
router.post('/google', googleLogin);
router.post('/demo-login', demoLogin);

export default router;
