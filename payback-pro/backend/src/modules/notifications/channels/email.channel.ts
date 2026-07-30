import nodemailer from "nodemailer";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { prisma } from "../../../prisma/client";
import { NotificationChannel, ReminderPayload, ChannelResult } from "../notification.types";

// ──────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between retries

// ──────────────────────────────────────────────────────────────────────────
// MODERN HTML EMAIL TEMPLATE
// ──────────────────────────────────────────────────────────────────────────
function buildEmailHtml(payload: ReminderPayload, supportEmail: string): string {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(payload.amountDue);

  const formattedLoanAmount = payload.loanAmount
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(payload.loanAmount)
    : "—";

  const dueDateStr = payload.dueDate
    ? new Date(payload.dueDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not specified";

  const reminderDateStr = payload.reminderDate
    ? new Date(payload.reminderDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const upiId = process.env.UPI_ID || "";

  // QR code section (only if qrCodeBase64 is available)
  const qrSection = payload.qrCodeBase64
    ? `
      <div style="text-align:center;margin:24px 0 16px 0;background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:12px;padding:24px;">
        <p style="font-size:14px;color:#111827;margin:0 0 16px 0;font-weight:800;text-transform:uppercase;letter-spacing:1px;">
          SCAN THIS QR USING ANY UPI APP
        </p>
        <div style="display:inline-block;padding:12px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <img src="cid:upi-qr-code" alt="UPI QR Code" width="180" height="180" style="display:block;" />
        </div>
        <p style="font-size:12px;color:#4B5563;margin:16px 0 12px 0;font-weight:600;">
          Google Pay | PhonePe | Paytm | BHIM | Amazon Pay
        </p>
        ${
          upiId
            ? `<p style="font-size:13px;color:#374151;margin:8px 0 4px 0;font-weight:600;">UPI ID: <span style="font-family:monospace;color:#111827;">${upiId}</span></p>`
            : ""
        }
        <p style="font-size:13px;color:#374151;margin:4px 0 0 0;font-weight:600;">
          Amount: <span style="color:#2563EB;font-weight:700;">₹${payload.amountDue.toLocaleString("en-IN")}</span>
        </p>
      </div>`
    : "";

  const appUrl = process.env.APP_URL || process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.CLIENT_URL || "http://localhost:3000";
  const pdfUrl = payload.loanId ? `${appUrl}/api/loans/${payload.loanId}/summary` : "#";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Reminder - PayBack Pro</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(0,0,0,0.05),0 4px 6px -2px rgba(0,0,0,0.02);">
          
          <!-- Gradient Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#1E40AF 0%,#2563EB 50%,#3B82F6 100%);padding:40px 48px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1.5px;">PayBack Pro</span>
                    <h1 style="margin:6px 0 4px 0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">
                      Friendly Payment Reminder
                    </h1>
                    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.75);">
                      Helping you stay on top of your payments.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding:40px 48px 24px 48px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:700;color:#111827;">
                Hello ${payload.borrowerName} 👋
              </h2>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:24px;color:#374151;">
                We hope you're doing well. This is a friendly reminder regarding your pending payment. Please find the details of your outstanding balance below:
              </p>
            </td>
          </tr>

          <!-- Payment Summary Card -->
          <tr>
            <td style="padding:0 48px 24px 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 1px 3px 0 rgba(0,0,0,0.05);overflow:hidden;">
                
                <!-- Main Owed Amount Header -->
                <tr>
                  <td style="padding:24px;background:#F8FAFC;border-bottom:1px solid #E5E7EB;text-align:center;">
                    <span style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Outstanding Amount</span>
                    <h3 style="margin:6px 0 0 0;font-size:36px;font-weight:800;color:#2563EB;letter-spacing:-1px;">
                      ${formattedAmount}
                    </h3>
                  </td>
                </tr>

                <!-- Details Rows -->
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                      <tr>
                        <td style="padding:8px 0;color:#6B7280;">Loan Amount</td>
                        <td style="padding:8px 0;font-weight:600;color:#111827;text-align:right;">${formattedLoanAmount}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6B7280;border-top:1px solid #F1F5F9;">Loan ID</td>
                        <td style="padding:8px 0;font-weight:600;color:#111827;text-align:right;font-family:monospace;border-top:1px solid #F1F5F9;">${payload.loanId || "—"}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6B7280;border-top:1px solid #F1F5F9;">Due Date</td>
                        <td style="padding:8px 0;font-weight:600;color:#EF4444;text-align:right;border-top:1px solid #F1F5F9;">${dueDateStr}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6B7280;border-top:1px solid #F1F5F9;">Status</td>
                        <td style="padding:8px 0;text-align:right;border-top:1px solid #F1F5F9;">
                          <span style="display:inline-block;padding:2px 8px;background:#FEF3C7;color:#D97706;border-radius:9999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Pending</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Custom Message Box -->
          ${
            payload.message
              ? `
              <tr>
                <td style="padding:0 48px 24px 48px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                    style="background:#FFFBEB;border:1px solid #FEF3C7;border-radius:8px;">
                    <tr>
                      <td style="padding:16px 20px;font-size:14px;color:#B45309;line-height:22px;font-style:italic;">
                        <strong>Message from Lender:</strong><br/>
                        "${payload.message.replace(/\n/g, "<br/>")}"
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`
              : ""
          }





          <!-- Dynamic QR Code Section -->
          ${qrSection ? `
          <tr>
            <td style="padding:0 48px 24px 48px;">
              ${qrSection}
            </td>
          </tr>` : ""}



          <!-- Detailed Borrower Fields -->
          <tr>
            <td style="padding:0 48px 24px 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:12px;padding:20px;font-size:13px;color:#374151;">
                <tr>
                  <td colspan="2" style="font-weight:700;color:#111827;padding-bottom:12px;border-bottom:1px solid #E5E7EB;">
                    Borrower Details
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0 4px 0;color:#6B7280;">Borrower Name</td>
                  <td style="padding:8px 0 4px 0;font-weight:600;text-align:right;color:#111827;">${payload.borrowerName}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#6B7280;">Phone Number</td>
                  <td style="padding:4px 0;font-weight:600;text-align:right;color:#111827;">${payload.borrowerPhone || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#6B7280;">Loan Amount</td>
                  <td style="padding:4px 0;font-weight:600;text-align:right;color:#111827;">${formattedLoanAmount}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#6B7280;">Outstanding Balance</td>
                  <td style="padding:4px 0;font-weight:600;text-align:right;color:#2563EB;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#6B7280;">Interest Rate</td>
                  <td style="padding:4px 0;font-weight:600;text-align:right;color:#111827;">${payload.interestRate !== null && payload.interestRate !== undefined ? `${payload.interestRate}%` : "—"}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#6B7280;">Due Date</td>
                  <td style="padding:4px 0;font-weight:600;text-align:right;color:#111827;">${dueDateStr}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0 8px 0;color:#6B7280;border-bottom:1px solid #E5E7EB;">Reminder Date</td>
                  <td style="padding:4px 0 8px 0;font-weight:600;text-align:right;color:#111827;border-bottom:1px solid #E5E7EB;">${reminderDateStr}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quick Actions -->
          <tr>
            <td style="padding:0 48px 24px 48px;text-align:center;">
              <div style="margin-top:8px;">

                <a href="${pdfUrl}" target="_blank"
                  style="display:inline-block;margin:4px 8px;font-size:12px;font-weight:700;color:#4B5563;text-decoration:none;padding:8px 16px;border:1px solid #D1D5DB;border-radius:6px;background-color:#FFFFFF;">
                  📄 Download Loan Summary
                </a>
                <a href="${payload.paymentLink || "#"}" target="_blank"
                  style="display:inline-block;margin:4px 8px;font-size:12px;font-weight:700;color:#2563EB;text-decoration:none;padding:8px 16px;border:1px solid #2563EB;border-radius:6px;background-color:#FFFFFF;">
                  💳 Pay via UPI
                </a>
                <a href="mailto:${supportEmail}"
                  style="display:inline-block;margin:4px 8px;font-size:12px;font-weight:700;color:#4B5563;text-decoration:none;padding:8px 16px;border:1px solid #D1D5DB;border-radius:6px;background-color:#FFFFFF;">
                  📞 Contact Lender
                </a>
              </div>
            </td>
          </tr>

          <!-- Notice -->
          <tr>
            <td style="padding:0 48px 24px 48px;text-align:center;">
              <p style="font-size:12px;color:#9CA3AF;margin:0 0 4px 0;line-height:18px;">
                If you've already completed your payment, please ignore this reminder.
              </p>
              <p style="font-size:12px;color:#9CA3AF;margin:0;line-height:18px;font-weight:600;">
                Thank you for choosing PayBack Pro.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:8px 48px 0 48px;">
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px 40px 48px;text-align:center;">
              <p style="font-size:13px;font-weight:700;color:#374151;margin:0 0 6px 0;">
                💰 PayBack Pro
              </p>
              <p style="font-size:11px;color:#9CA3AF;margin:0 0 12px 0;line-height:16px;">
                This email was generated automatically. Sent securely by PayBack Pro.<br/>
                <a href="#" style="color:#6B7280;text-decoration:underline;">Website</a> • 
                <a href="mailto:${supportEmail}" style="color:#6B7280;text-decoration:underline;">Support</a> • 
                <a href="#" style="color:#6B7280;text-decoration:underline;">Privacy Policy</a> • 
                <a href="#" style="color:#6B7280;text-decoration:underline;">Terms</a>
              </p>
              <p style="font-size:11px;color:#9CA3AF;margin:0;">
                © 2026 PayBack Pro. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────────────────
// SLEEP HELPER
// ──────────────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────────────────────────────────
// EMAIL CHANNEL WITH RETRY
// ──────────────────────────────────────────────────────────────────────────
export const emailChannel: NotificationChannel = {
  name: "EMAIL",
  async send(payload: ReminderPayload): Promise<ChannelResult> {
    // 1. Validate recipient email
    if (!payload.borrowerEmail) {
      const msg = "Borrower has no email address on file.";
      logger.warn("Email skipped: no recipient", { borrower: payload.borrowerName });
      return { channel: "EMAIL", status: "FAILED", response: msg };
    }

    // 1.5 Validate template payload parameters
    const missingFields: string[] = [];
    if (!payload.borrowerName) missingFields.push("borrowerName");
    if (payload.loanAmount === null || payload.loanAmount === undefined) missingFields.push("loanAmount");
    if (payload.amountDue === null || payload.amountDue === undefined) missingFields.push("outstandingAmount");
    if (!payload.dueDate) missingFields.push("dueDate");
    
    // Validate paymentUrl if outstanding amount is greater than 0
    if (payload.amountDue > 0) {
      const paymentUrl = payload.paymentLink;
      if (!paymentUrl) {
        missingFields.push("paymentLink (paymentUrl does not exist)");
      } else {
        // Check if absolute URL (starts with http:// or https://)
        const isAbsolute = paymentUrl.startsWith("http://") || paymentUrl.startsWith("https://");
        if (!isAbsolute) {
          missingFields.push(`paymentLink (paymentUrl "${paymentUrl}" is not an absolute HTTP/HTTPS URL)`);
        }
        

        
        // Validate URL syntax
        try {
          new URL(paymentUrl);
          // Verify it is properly encoded (e.g. no raw spaces or invalid characters)
          if (encodeURI(paymentUrl) !== paymentUrl) {
            missingFields.push(`paymentLink (paymentUrl "${paymentUrl}" is not fully URL-encoded)`);
          }
        } catch (e: any) {
          missingFields.push(`paymentLink (paymentUrl "${paymentUrl}" is invalid: ${e.message})`);
        }
      }

      if (!payload.qrCodeBase64) {
        missingFields.push("qrCodeBase64 (QR Code)");
      }
    }

    // Check if any placeholders still exist in the message
    const placeholderRegex = /\{amount\}|\{\{amount\}\}|\{name\}|\{\{name\}\}|\{borrowerName\}|\{\{borrowerName\}\}|\{dueDate\}|\{\{dueDate\}\}/i;
    if (payload.message && placeholderRegex.test(payload.message)) {
      missingFields.push("message (unreplaced placeholders remain)");
    }

    if (missingFields.length > 0) {
      const errorMsg = `Email validation failed: missing required fields or unreplaced placeholders: [${missingFields.join(", ")}]`;
      logger.error(errorMsg, { borrower: payload.borrowerName });
      return { channel: "EMAIL", status: "FAILED", response: errorMsg };
    }

    // Debugging requirement: Log all details before sending
    logger.info("Email Reminder Debugging Telemetry (Email Channel)", {
      borrowerName: payload.borrowerName,
      loanId: payload.loanId || "N/A",
      outstandingAmount: payload.amountDue,
      generatedPaymentUrl: payload.paymentLink || "N/A",
      qrPaymentUrl: payload.paymentLink || payload.upiLink || "N/A",
      emailRecipient: payload.borrowerEmail
    });

    // 2. Fetch dynamic SMTP settings from database
    const globalSettings = await prisma.globalSettings.findUnique({
      where: { id: "global" }
    });

    const host = globalSettings?.smtpHost || env.smtp.host;
    const port = globalSettings?.smtpPort ? Number(globalSettings.smtpPort) : env.smtp.port;
    const user = globalSettings?.smtpUser || env.smtp.user;
    const pass = globalSettings?.smtpPass || env.smtp.pass;
    const from = globalSettings?.smtpFrom || env.smtp.from;
    const secure = globalSettings?.smtpPort ? (Number(globalSettings.smtpPort) === 465) : env.smtp.secure;

    // 3. Validate SMTP configuration
    if (!host) {
      const msg = "SMTP not configured: SMTP_HOST is missing.";
      logger.error(msg);
      return { channel: "EMAIL", status: "FAILED", response: msg };
    }
    if (!user || !pass) {
      const msg = "SMTP not configured: set SMTP_USER and SMTP_PASS in settings or .env";
      logger.error(msg);
      return { channel: "EMAIL", status: "FAILED", response: msg };
    }

    // 4. Create dynamic SMTP transporter
    const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "false", // false for port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

    // 5. Verify SMTP connection
    try {
      await transporter.verify();
      logger.info("SMTP connection verified successfully", { host, port });
    } catch (verifyErr: any) {
      const detail = verifyErr.code === "EAUTH"
        ? "SMTP Authentication Failed — check SMTP_USER and SMTP_PASS (use Gmail App Password, not normal password)."
        : verifyErr.code === "ECONNREFUSED"
        ? `SMTP Connection Refused — cannot reach ${host}:${port}. Check host/port or firewall.`
        : verifyErr.code === "ESOCKET"
        ? "SMTP Socket Error — possible network or TLS issue. Check SMTP_SECURE and SMTP_PORT."
        : `SMTP Connection Failed: ${verifyErr.message || "Unknown SMTP error"}`;

      logger.error("SMTP verification failed", { code: verifyErr.code, message: verifyErr.message });
      return { channel: "EMAIL", status: "FAILED", response: detail };
    }

    // 6. Build the email
    const supportEmail = globalSettings?.adminEmail || "support@paybackpro.com";
    const htmlBody = buildEmailHtml(payload, supportEmail);
    const plainText = `Hi ${payload.borrowerName},\n\nThis is a friendly reminder about your outstanding payment of ₹${payload.amountDue}.\n${payload.dueDate ? `Due date: ${new Date(payload.dueDate).toDateString()}\n` : ""}${payload.message}\n\nThank you,\nPayBack Pro`;

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to: payload.borrowerEmail,
      subject: payload.subject || `Payment Reminder — ₹${payload.amountDue.toLocaleString("en-IN")}`,
      text: plainText,
      html: htmlBody,
    };

    if (payload.qrCodeBase64) {
      const base64Part = payload.qrCodeBase64.includes(",")
        ? payload.qrCodeBase64.split(",")[1]
        : payload.qrCodeBase64;
      mailOptions.attachments = [
        {
          filename: "upi-qr.png",
          content: Buffer.from(base64Part, "base64"),
          cid: "upi-qr-code"
        }
      ];
    }

    // 7. Send with retry (up to MAX_RETRIES attempts)
    let lastError = "";
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const info = await transporter.sendMail(mailOptions);
        logger.info("✓ Email sent successfully", {
          to: payload.borrowerEmail,
          messageId: info.messageId,
          attempt,
        });
        return {
          channel: "EMAIL",
          status: "SUCCESS",
          response: `Email delivered (messageId: ${info.messageId}, attempt: ${attempt})`,
        };
      } catch (err: any) {
        lastError = err.responseCode
          ? `SMTP Error ${err.responseCode}: ${err.response || err.message}`
          : err.code === "EENVELOPE"
          ? `Invalid recipient email address: ${payload.borrowerEmail}`
          : err.code === "ECONNECTION"
          ? "Internet connection failed — could not reach SMTP server."
          : err.message || "Unknown SMTP error during transmission";

        logger.warn(`Email attempt ${attempt}/${MAX_RETRIES} failed`, {
          to: payload.borrowerEmail,
          error: lastError,
          attempt,
        });

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt); // exponential-ish backoff
        }
      }
    }

    // All retries exhausted
    logger.error("❌ Email delivery failed after all retries", {
      to: payload.borrowerEmail,
      error: lastError,
      totalAttempts: MAX_RETRIES,
    });
    return {
      channel: "EMAIL",
      status: "FAILED",
      response: `Email Failed after ${MAX_RETRIES} attempts: ${lastError}`,
    };
  },
};
