import { prisma } from '../../prisma/client';
import { Prisma, LoanStatus } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ApiError } from '../../utils/apiError';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const createOrder = async (loanId: string, borrowerId: string) => {
    const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { repayments: true }
    });

    if (!loan) {
        throw ApiError.notFound('Loan not found');
    }

    if (loan.borrowerId !== borrowerId) {
        throw ApiError.forbidden('Borrower mismatch');
    }

    const totalPaid = loan.repayments.reduce((acc, rep) => acc.plus(rep.amount), new Prisma.Decimal(0));
    const outstanding = loan.principal.plus(loan.principal.mul(loan.interestRate).div(100)).minus(totalPaid);

    if (outstanding.lte(0)) {
        throw ApiError.badRequest('Loan is already fully paid');
    }

    const existingPayment = await prisma.payment.findFirst({
        where: { loanId, status: 'CREATED' }
    });

    if (existingPayment) {
        return { payment: existingPayment, keyId: env.razorpay.keyId };
    }

    const isMock = !env.razorpay.keyId || env.razorpay.keyId.includes('placeholder');
    let orderId = "";

    if (isMock) {
        orderId = 'mock_order_' + Math.random().toString(36).substring(2, 15);
    } else {
        try {
            const razorpay = new Razorpay({
                key_id: env.razorpay.keyId,
                key_secret: env.razorpay.keySecret
            });

            const amountInPaise = Math.round(outstanding.toNumber() * 100);

            const order = await razorpay.orders.create({
                amount: amountInPaise,
                currency: 'INR',
                receipt: 'loan_' + loanId
            });
            orderId = order.id;
        } catch (err: any) {
            logger.warn("Razorpay order creation failed, falling back to mock order for testing", { error: err.message });
            orderId = 'mock_order_' + Math.random().toString(36).substring(2, 15);
        }
    }

    const payment = await prisma.payment.create({
        data: {
            razorpayOrderId: orderId,
            loanId,
            borrowerId,
            amount: outstanding,
            currency: 'INR',
            status: 'CREATED'
        }
    });

    return { payment, keyId: env.razorpay.keyId || 'mock_key' };
};

export const verifyPayment = async (razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) => {
    const payment = await prisma.payment.findUnique({
        where: { razorpayOrderId },
        include: { loan: { include: { repayments: true } } }
    });

    if (!payment) {
        throw ApiError.notFound('Payment not found');
    }

    if (payment.status === 'PAID') {
        return payment;
    }

    const isMock = razorpayOrderId.startsWith('mock_order_');
    if (!isMock) {
        const generatedSignature = crypto.createHmac('sha256', env.razorpay.keySecret)
            .update(razorpayOrderId + '|' + razorpayPaymentId)
            .digest('hex');

        if (generatedSignature !== razorpaySignature) {
            throw ApiError.badRequest('Payment verification failed - invalid signature');
        }
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
        const p = await tx.payment.update({
            where: { id: payment.id },
            data: {
                status: 'PAID',
                razorpayPaymentId,
                razorpaySignature
            }
        });

        await tx.repayment.create({
            data: {
                loanId: payment.loanId,
                amount: payment.amount,
                paidAt: new Date(),
                note: 'Razorpay payment ' + razorpayPaymentId
            }
        });

        const loan = await tx.loan.findUnique({
            where: { id: payment.loanId },
            include: { repayments: true }
        });
        
        if (loan) {
            const totalPaid = loan.repayments.reduce((acc, rep) => acc.plus(rep.amount), new Prisma.Decimal(0));
            const totalDue = loan.principal.plus(loan.principal.mul(loan.interestRate).div(100));
            const remaining = totalDue.minus(totalPaid);
            
            let status: LoanStatus = 'ACTIVE';
            if (remaining.lte(0)) status = 'PAID';
            else if (totalPaid.gt(0)) status = 'PARTIAL';
            
            await tx.loan.update({
                where: { id: loan.id },
                data: { status }
            });
        }

        // Mark/cancel pending or scheduled reminders associated with this loan
        await tx.reminder.updateMany({
            where: { loanId: payment.loanId, status: { in: ['PENDING', 'SCHEDULED'] } },
            data: { status: 'COMPLETED' as any }
        });
        
        return p;
    });

    // Send payment confirmation email asynchronously
    const borrower = await prisma.borrower.findUnique({
        where: { id: payment.borrowerId }
    });
    if (borrower) {
        sendPaymentConfirmationEmail(
            borrower.email,
            borrower.name,
            Number(payment.amount),
            payment.loanId
        ).catch((err) => logger.error("Failed sending verification payment email confirmation", err));
    }

    return updatedPayment;
};

export const handleWebhook = async (rawBody: string, signature: string) => {
    const generatedSignature = crypto.createHmac('sha256', env.razorpay.webhookSecret)
        .update(rawBody)
        .digest('hex');
        
    if (generatedSignature !== signature) {
        throw ApiError.badRequest('Invalid webhook signature');
    }
    
    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch (e) {
        throw ApiError.badRequest('Invalid webhook body');
    }
    
    if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
        let razorpayOrderId = "";
        let razorpayPaymentId = "";

        if (payload.event === 'payment.captured') {
            razorpayOrderId = payload.payload.payment.entity.order_id;
            razorpayPaymentId = payload.payload.payment.entity.id;
        } else {
            razorpayOrderId = payload.payload.order.entity.id;
            razorpayPaymentId = "pay_webhook_" + Math.random().toString(36).substring(2, 10);
        }
        
        const payment = await prisma.payment.findUnique({
            where: { razorpayOrderId }
        });
        
        if (!payment) {
            logger.error(`Payment not found for order ${razorpayOrderId}`);
            return;
        }
        
        if (payment.status === 'PAID') {
            return; // Idempotent
        }
        
        await prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'PAID',
                    razorpayPaymentId
                }
            });
            
            await tx.repayment.create({
                data: {
                    loanId: payment.loanId,
                    amount: payment.amount,
                    paidAt: new Date(),
                    note: 'Razorpay webhook payment ' + razorpayPaymentId
                }
            });
            
            const loan = await tx.loan.findUnique({
                where: { id: payment.loanId },
                include: { repayments: true }
            });
            
            if (loan) {
                const totalPaid = loan.repayments.reduce((acc, rep) => acc.plus(rep.amount), new Prisma.Decimal(0));
                const totalDue = loan.principal.plus(loan.principal.mul(loan.interestRate).div(100));
                const remaining = totalDue.minus(totalPaid);
                
                let status: LoanStatus = 'ACTIVE';
                if (remaining.lte(0)) status = 'PAID';
                else if (totalPaid.gt(0)) status = 'PARTIAL';
                
                await tx.loan.update({
                    where: { id: loan.id },
                    data: { status }
                });
            }

            // Mark/cancel pending or scheduled reminders associated with this loan
            await tx.reminder.updateMany({
                where: { loanId: payment.loanId, status: { in: ['PENDING', 'SCHEDULED'] } },
                data: { status: 'COMPLETED' as any }
            });
        });
        
        // Send payment confirmation email asynchronously
        const borrower = await prisma.borrower.findUnique({
            where: { id: payment.borrowerId }
        });
        if (borrower) {
            sendPaymentConfirmationEmail(
                borrower.email,
                borrower.name,
                Number(payment.amount),
                payment.loanId
            ).catch((err) => logger.error("Failed sending webhook payment email confirmation", err));
        }

        logger.info(`Webhook processed for payment ${razorpayPaymentId}`);
    }
};

export const getOrderDetails = async (razorpayOrderId: string) => {
    const payment = await prisma.payment.findUnique({
        where: { razorpayOrderId },
        include: { 
            loan: { include: { repayments: true } }, 
            borrower: { include: { user: true } }
        }
    });
    
    if (!payment) {
        throw ApiError.notFound('Invalid payment token');
    }
    
    // Check if loan is already fully paid
    if (payment.status === 'PAID') {
        // Handled: payment page will show completed status
    } else {
        // Check if loan was already fully paid by other repayments
        const loan = payment.loan;
        const totalPaid = loan.repayments.reduce((acc, rep) => acc.plus(rep.amount), new Prisma.Decimal(0));
        const totalDue = loan.principal.plus(loan.principal.mul(loan.interestRate).div(100));
        const remaining = totalDue.minus(totalPaid);
        if (remaining.lte(0)) {
            throw ApiError.badRequest('This loan is already fully paid');
        }
    }

    // Expiry check: Expiry after 7 days
    const expiryTimeMs = 7 * 24 * 60 * 60 * 1000; // 7 days expiry
    const isExpired = Date.now() - new Date(payment.createdAt).getTime() > expiryTimeMs;
    if (isExpired && payment.status !== 'PAID') {
        throw ApiError.badRequest('This payment link has expired');
    }

    const upiId = process.env.UPI_ID || "";
    const upiName = process.env.UPI_NAME || "PayBackPro";
    let upiLink = "";
    let qrCodeBase64 = "";

    if (upiId) {
        const ref = `RP_${payment.id.replace(/-/g, "").substring(0, 12)}`; // Payment Reference
        const note = `Loan Payment - Borrower: ${payment.borrower.name.substring(0, 20)} - Loan: ${payment.loanId.substring(0, 8)}`;
        upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${Number(payment.amount).toFixed(2)}&tn=${encodeURIComponent(note)}&tr=${encodeURIComponent(ref)}&cu=INR`;
        
        try {
            // Generate QR Code dynamically
            const QRCode = require('qrcode');
            qrCodeBase64 = await QRCode.toDataURL(upiLink);
        } catch (qrErr) {
            logger.warn("Failed to generate QR Code in getOrderDetails", qrErr);
        }
    }
    
    return { 
        payment: {
            id: payment.id,
            razorpayOrderId: payment.razorpayOrderId,
            amount: payment.amount.toString(),
            status: payment.status,
            loanId: payment.loanId,
            borrowerId: payment.borrowerId
        },
        keyId: env.razorpay.keyId,
        borrower: {
            name: payment.borrower.name,
            email: payment.borrower.email,
            phone: payment.borrower.phone
        },
        loan: {
            principal: payment.loan.principal.toString(),
            interestRate: payment.loan.interestRate.toString(),
            dueDate: payment.loan.dueDate ? payment.loan.dueDate.toISOString() : null
        },
        lenderName: payment.borrower.user.name,
        upiId,
        upiName,
        upiLink,
        qrCodeBase64
    };
};

export const sendPaymentConfirmationEmail = async (
    borrowerEmail: string | null | undefined,
    borrowerName: string,
    amount: number,
    loanId: string
) => {
    if (!borrowerEmail) return;

    const globalSettings = await prisma.globalSettings.findUnique({
        where: { id: 'global' }
    });

    const host = globalSettings?.smtpHost || env.smtp.host;
    const port = globalSettings?.smtpPort ? Number(globalSettings.smtpPort) : env.smtp.port;
    const user = globalSettings?.smtpUser || env.smtp.user;
    const pass = globalSettings?.smtpPass || env.smtp.pass;
    const from = globalSettings?.smtpFrom || env.smtp.from;
    const secure = globalSettings?.smtpPort ? (Number(globalSettings.smtpPort) === 465) : env.smtp.secure;

    if (!host || !user || !pass) {
        logger.warn('SMTP settings not configured, skipping confirmation email');
        return;
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });

    const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E5E7EB; border-radius: 8px;">
            <h2 style="color: #10B981; margin-top: 0;">🎉 Payment Confirmed</h2>
            <p>Hello ${borrowerName},</p>
            <p>We have successfully received your payment of <strong>${formattedAmount}</strong> for Loan ID: <strong>${loanId}</strong>.</p>
            <p>Your outstanding balance has been updated accordingly.</p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
            <p style="font-size: 12px; color: #6B7280; text-align: center;">This is an automated confirmation sent securely by PayBack Pro.</p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from,
            to: borrowerEmail,
            subject: `Payment Confirmed: ${formattedAmount} Received - PayBack Pro`,
            html
        });
        logger.info('Payment confirmation email sent successfully', { to: borrowerEmail });
    } catch (err: any) {
        logger.error('Failed to send payment confirmation email', { error: err.message });
    }
};
