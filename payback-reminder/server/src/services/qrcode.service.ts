import QRCode from "qrcode";

interface UpiQrOptions {
  payeeUpiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}

/**
 * Builds a standard UPI deep-link string following the "upi://pay" spec
 * supported by GPay, PhonePe, Paytm, BHIM, etc.
 */
export function buildUpiPaymentString({ payeeUpiId, payeeName, amount, note }: UpiQrOptions): string {
  const params = new URLSearchParams({
    pa: payeeUpiId, // payee address (UPI ID)
    pn: payeeName, // payee name
    am: amount.toFixed(2), // amount
    cu: "INR",
  });
  if (note) params.set("tn", note); // transaction note

  return `upi://pay?${params.toString()}`;
}

/** Returns a base64 PNG data URL for the given UPI payment string. */
export async function generateUpiQrDataUrl(options: UpiQrOptions): Promise<string> {
  const upiString = buildUpiPaymentString(options);
  return QRCode.toDataURL(upiString, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });
}

/** Returns a PNG buffer (useful for attaching the QR to reminder emails). */
export async function generateUpiQrBuffer(options: UpiQrOptions): Promise<Buffer> {
  const upiString = buildUpiPaymentString(options);
  return QRCode.toBuffer(upiString, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });
}
