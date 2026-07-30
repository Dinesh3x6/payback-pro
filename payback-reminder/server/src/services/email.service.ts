import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "@/config/env";

interface ReminderEmailInput {
  to: string;
  borrowerName: string;
  amount: number;
  dueDate: Date;
  qrCodeBuffer: Buffer;
  upiLink: string;
  note?: string;
}

let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) resendClient = new Resend(env.resendApiKey);
  return resendClient;
}

let smtpTransport: nodemailer.Transporter | null = null;
function getSmtpTransport() {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return smtpTransport;
}

function reminderHtml(input: ReminderEmailInput) {
  const formattedDue = input.dueDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `
  <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
    <h2 style="color: #111827;">Payment Reminder</h2>
    <p style="color:#374151;">Hi ${input.borrowerName},</p>
    <p style="color:#374151;">
      This is a friendly reminder that a payment of
      <strong>₹${input.amount.toFixed(2)}</strong> is due on <strong>${formattedDue}</strong>.
    </p>
    ${input.note ? `<p style="color:#6b7280;">Note: ${input.note}</p>` : ""}
    <p style="color:#374151;">Scan the QR code below with any UPI app to pay instantly:</p>
    <div style="text-align:center; margin: 20px 0;">
      <img src="cid:upi-qr" alt="UPI QR Code" width="220" height="220" />
    </div>
    <p style="text-align:center;">
      <a href="${input.upiLink}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">
        Pay Now via UPI
      </a>
    </p>
    <p style="color:#9ca3af; font-size:12px; margin-top: 24px;">
      Sent automatically by PayBack Reminder. Once payment is marked as paid, reminders will stop.
    </p>
  </div>`;
}

/** Sends a reminder email with the pending amount and UPI QR code attached. */
export async function sendReminderEmail(input: ReminderEmailInput) {
  const subject = `Payment Reminder: ₹${input.amount.toFixed(2)} due`;
  const html = reminderHtml(input);

  if (env.emailProvider === "resend") {
  const resend = getResend();

 const response = await resend.emails.send({
  from: env.emailFrom,
  to: input.to,
  subject,
  html,
  attachments: [
    {
      filename: "upi-qr.png",
      content: input.qrCodeBuffer.toString("base64"),
  
    },
  ],
});

 

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response;
}

  // nodemailer / SMTP fallback
  const transport = getSmtpTransport();
  return transport.sendMail({
    from: env.emailFrom,
    to: input.to,
    subject,
    html,
    attachments: [
      {
        filename: "upi-qr.png",
        content: input.qrCodeBuffer,
        cid: "upi-qr",
      },
    ],
  });
}
