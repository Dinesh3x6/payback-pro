import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as paymentService from './payment.service';

export const createOrderHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { loanId, borrowerId } = req.body;
    const result = await paymentService.createOrder(loanId, borrowerId);
    res.json({ success: true, data: result });
});

export const verifyHandler = asyncHandler(async (req: Request, res: Response) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const result = await paymentService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    res.json({ success: true, data: result });
});

export const webhookHandler = asyncHandler(async (req: Request, res: Response) => {
    const rawBody = (req as any).rawBody;
    const signature = req.headers['x-razorpay-signature'] as string;
    
    await paymentService.handleWebhook(rawBody, signature);
    res.status(200).send('OK');
});

export const getOrderHandler = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await paymentService.getOrderDetails(orderId);
    res.json({ success: true, data: result });
});
