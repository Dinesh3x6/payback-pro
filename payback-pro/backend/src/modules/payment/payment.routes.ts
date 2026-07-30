import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
    createOrderHandler,
    verifyHandler,
    webhookHandler,
    getOrderHandler
} from './payment.controller';

const router = Router();

router.post('/create-order', requireAuth, createOrderHandler);
router.post('/verify', verifyHandler);
router.post('/webhook', webhookHandler);
router.get('/order/:orderId', getOrderHandler);

export default router;
