import nodemailer from "nodemailer";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { prisma } from "../../../prisma/client";
import { NotificationChannel, ReminderPayload, ChannelResult } from "../notification.types";
import { sendBrevoEmail, BrevoEmailPayload } from "../../../utils/brevo";

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
  const upiName = process.env.UPI_NAME || "PayBackPro";
  const note = `Loan Payment - ${payload.loanId || "N/A"}`;
  const upiIntentUrl = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${payload.amountDue.toFixed(2)}&tn=${encodeURIComponent(note)}&cu=INR`
    : (payload.paymentLink || "#");

  let backendBaseUrl = process.env.RENDER_EXTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || process.env.API_URL || "http://localhost:5000";
  if (backendBaseUrl.endsWith("/")) {
    backendBaseUrl = backendBaseUrl.slice(0, -1);
  }
  let apiUrl = backendBaseUrl.includes("/api") ? backendBaseUrl : `${backendBaseUrl}/api`;
  const pdfUrl = payload.loanId ? `${apiUrl}/loans/${payload.loanId}/summary` : "#";

  // QR code section (only if payload.loanId is available)
  const qrSection = payload.loanId
    ? `
      <div align="center" style="margin:24px 0;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;padding:32px 24px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.02),0 2px 4px -1px rgba(0,0,0,0.01);">
        <p style="font-size:12px;color:#475569;margin:0 0 16px 0;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
          Scan to Pay
        </p>
        <div style="display:inline-block;padding:16px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.04);">
          <img src="${apiUrl}/loans/${payload.loanId}/qr" alt="UPI QR Code" width="180" height="180" style="display:block;" />
        </div>
        <p style="font-size:12px;color:#64748B;margin:16px 0 12px 0;font-weight:500;">
          Google Pay | PhonePe | Paytm | BHIM | Amazon Pay
        </p>
        ${
          upiId
            ? `<p style="font-size:13px;color:#334155;margin:8px 0 4px 0;font-weight:600;">UPI ID: <span style="font-family:monospace;color:#0F172A;background:#F1F5F9;padding:2px 6px;border-radius:4px;">${upiId}</span></p>`
            : ""
        }
        <p style="font-size:13px;color:#334155;margin:4px 0 0 0;font-weight:600;">
          Amount: <span style="color:#2563EB;font-weight:700;">₹${payload.amountDue.toLocaleString("en-IN")}</span>
        </p>
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Reminder - PayBack Pro</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(15,23,42,0.05),0 4px 6px -2px rgba(15,23,42,0.02);">
          
          <!-- Dark Navy Header -->
          <tr>
            <td style="background-color:#0F172A;padding:40px 48px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;margin-bottom:4px;">
                      💰 PayBack Pro
                    </div>
                    <div style="font-size:12px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">
                      Smart Loan & Payment Reminder
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:40px 48px 24px 48px;">
              <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#0F172A;letter-spacing:-0.5px;">
                Hello ${payload.borrowerName},
              </h2>
              <p style="margin:0;font-size:15px;line-height:24px;color:#334155;">
                This is a friendly reminder regarding your outstanding loan payment. Please review the details below and complete the payment before the due date.
              </p>
            </td>
          </tr>

          <!-- Message from Lender (Subtle Yellow Card) -->
          ${
            payload.message
              ? `
              <tr>
                <td style="padding:0 48px 24px 48px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                    style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;">
                    <tr>
                      <td style="padding:20px;font-size:14px;color:#B45309;line-height:22px;">
                        <strong style="font-weight:700;color:#92400E;display:block;margin-bottom:6px;text-transform:uppercase;font-size:11px;letter-spacing:1px;">Message from Lender</strong>
                        <span style="font-style:italic;">"${payload.message.replace(/\n/g, "<br/>")}"</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`
              : ""
          }

          <!-- Loan Information Details Card -->
          <tr>
            <td style="padding:0 48px 24px 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.02);">
                
                <!-- Highlights Outstanding Amount -->
                <tr>
                  <td style="padding:28px 24px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;text-align:center;">
                    <span style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1.5px;display:block;margin-bottom:6px;">Outstanding Amount</span>
                    <h3 style="margin:0;font-size:38px;font-weight:800;color:#2563EB;letter-spacing:-1px;">
                      ${formattedAmount}
                    </h3>
                  </td>
                </tr>

                <!-- Details Rows -->
                <tr>
                  <td style="padding:24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#334155;">
                      <tr>
                        <td style="padding:10px 0;color:#64748B;">Borrower Name</td>
                        <td style="padding:10px 0;font-weight:600;color:#0F172A;text-align:right;">${payload.borrowerName}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;color:#64748B;border-top:1px solid #F1F5F9;">Loan Amount</td>
                        <td style="padding:10px 0;font-weight:600;color:#0F172A;text-align:right;border-top:1px solid #F1F5F9;">${formattedLoanAmount}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;color:#64748B;border-top:1px solid #F1F5F9;">Interest Rate</td>
                        <td style="padding:10px 0;font-weight:600;color:#0F172A;text-align:right;border-top:1px solid #F1F5F9;">${payload.interestRate !== null && payload.interestRate !== undefined ? `${payload.interestRate}%` : "—"}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;color:#64748B;border-top:1px solid #F1F5F9;">Due Date</td>
                        <td style="padding:10px 0;font-weight:600;color:#EF4444;text-align:right;border-top:1px solid #F1F5F9;">${dueDateStr}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;color:#64748B;border-top:1px solid #F1F5F9;">Reminder Date</td>
                        <td style="padding:10px 0;font-weight:600;color:#0F172A;text-align:right;border-top:1px solid #F1F5F9;">${reminderDateStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dynamic QR Code Section -->
          ${qrSection ? `
          <tr>
            <td style="padding:0 48px 24px 48px;">
              ${qrSection}
            </td>
          </tr>` : ""}

          <!-- Quick Actions Buttons -->
          <tr>
            <td style="padding:12px 48px 36px 48px;text-align:center;">
              <!-- Primary Action Button: Pay via UPI -->
              <div style="margin-bottom:20px;">
                <a href="${upiIntentUrl}"
                  style="display:inline-block;box-sizing:border-box;width:100%;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;padding:14px 24px;border-radius:8px;background-color:#2563EB;text-align:center;box-shadow:0 4px 6px -1px rgba(37,99,235,0.2);">
                  💳 Pay via UPI
                </a>
              </div>

              <!-- Secondary Actions: Equal Sized, Aligned properly -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%">
                    <a href="${pdfUrl}" target="_blank"
                      style="display:block;box-sizing:border-box;font-size:12px;font-weight:700;color:#475569;text-decoration:none;padding:12px 16px;border:1px solid #CBD5E1;border-radius:8px;background-color:#FFFFFF;text-align:center;">
                      📄 Download Summary
                    </a>
                  </td>
                  <td width="4%">&nbsp;</td>
                  <td width="48%">
                    <a href="mailto:${supportEmail}"
                      style="display:block;box-sizing:border-box;font-size:12px;font-weight:700;color:#475569;text-decoration:none;padding:12px 16px;border:1px solid #CBD5E1;border-radius:8px;background-color:#FFFFFF;text-align:center;">
                      📞 Contact Lender
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 48px;">
              <hr style="border:none;border-top:1px solid #E2E8F0;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 48px 48px 48px;text-align:center;">
              <p style="font-size:14px;font-weight:600;color:#475569;margin:0 0 8px 0;line-height:22px;">
                Thank you for using PayBack Pro.
              </p>
              <p style="font-size:12px;color:#64748B;margin:0 0 16px 0;line-height:20px;">
                If you have already completed this payment, please ignore this reminder.<br/>
                Need assistance? Contact your lender.
              </p>
              <p style="font-size:13px;font-weight:700;color:#0F172A;margin:0 0 4px 0;">
                PayBack Pro
              </p>
              <p style="font-size:11px;color:#94A3B8;margin:0 0 16px 0;">
                Secure Loan & Payment Management
              </p>
              <p style="font-size:12px;color:#64748B;margin:0;line-height:18px;">
                <a href="#" style="color:#2563EB;text-decoration:none;font-weight:600;">Website</a> &nbsp;|&nbsp; 
                <a href="#" style="color:#2563EB;text-decoration:none;font-weight:600;">Privacy Policy</a> &nbsp;|&nbsp; 
                <a href="#" style="color:#2563EB;text-decoration:none;font-weight:600;">Terms</a>
              </p>
              <p style="font-size:11px;color:#94A3B8;margin:24px 0 0 0;">
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

    // 2. Fetch dynamic SMTP settings from database (specifically from name/email)
    const globalSettings = await prisma.globalSettings.findUnique({
      where: { id: "global" }
    });

    const from = globalSettings?.smtpFrom || env.smtp.from;

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      const msg = "Brevo API Key not configured: BREVO_API_KEY environment variable is missing.";
      logger.error(msg);
      return { channel: "EMAIL", status: "FAILED", response: msg };
    }

    const fromNameMatch = from.match(/^([^<]+)/);
    const fromEmailMatch = from.match(/<([^>]+)>/) || [null, from];
    const fromName = fromNameMatch ? fromNameMatch[1].trim() : "PayBack Pro";
    const fromEmail = fromEmailMatch[1]?.trim() || "no-reply@paybackpro.local";

    logger.info("Email Reminder: Initiating Brevo HTTPS Connection", {
      fromName,
      fromEmail,
      recipient: payload.borrowerEmail
    });

    // 3. Build the email
    const supportEmail = globalSettings?.adminEmail || "support@paybackpro.com";
    let htmlBody = buildEmailHtml(payload, supportEmail);
    const plainText = `Hi ${payload.borrowerName},\n\nThis is a friendly reminder about your outstanding payment of ₹${payload.amountDue}.\n${payload.dueDate ? `Due date: ${new Date(payload.dueDate).toDateString()}\n` : ""}${payload.message}\n\nThank you,\nPayBack Pro`;

    if (payload.loanId) {
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || process.env.API_URL || "http://localhost:5000/api";
      if (apiUrl.endsWith("/")) {
        apiUrl = apiUrl.slice(0, -1);
      }
      if (!apiUrl.includes("/api")) {
        apiUrl += "/api";
      }
      const qrCodeUrl = `${apiUrl}/loans/${payload.loanId}/qr`;
      htmlBody = htmlBody.replace('src="cid:upi-qr-code"', `src="${qrCodeUrl}"`);
    }

    const brevoEmailPayload: BrevoEmailPayload = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: payload.borrowerEmail, name: payload.borrowerName }],
      subject: payload.subject || `Payment Reminder — ₹${payload.amountDue.toLocaleString("en-IN")}`,
      htmlContent: htmlBody,
      textContent: plainText
    };

    // 4. Send with retry (up to MAX_RETRIES attempts)
    let lastError = "";
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await sendBrevoEmail(apiKey, brevoEmailPayload);
        logger.info("✓ Email sent successfully via Brevo REST API", {
          to: payload.borrowerEmail,
          statusCode: result.statusCode,
          messageId: (result.data as any)?.messageId,
          attempt,
        });
        return {
          channel: "EMAIL",
          status: "SUCCESS",
          response: `Email delivered via Brevo API (statusCode: ${result.statusCode}, messageId: ${(result.data as any)?.messageId}, attempt: ${attempt})`,
        };
      } catch (err: any) {
        const errDetail = err.error ? JSON.stringify(err.error) : err.message || "Unknown error";
        lastError = `HTTP Status ${err.statusCode}: ${errDetail}`;

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
