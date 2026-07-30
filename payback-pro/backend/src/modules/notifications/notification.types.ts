// Central list of supported channels. Adding a new channel = add here + implement NotificationChannel.
export type ChannelName =
  | "EMAIL"
  | "WHATSAPP"
  | "SMS"
  | "TELEGRAM"
  | "PUSH"
  | "DESKTOP"
  | "IN_APP"
  | "DISCORD"
  | "SLACK"
  | "TEAMS"
  | "QR";

export interface ReminderPayload {
  borrowerName: string;
  borrowerEmail?: string | null;
  borrowerPhone?: string | null;
  amountDue: number;
  dueDate?: Date | null;
  subject?: string | null;
  message: string;
  // Dynamic UPI QR code (base64 data URI) and deep link, injected by reminder.service
  qrCodeBase64?: string | null;
  upiLink?: string | null;
  paymentLink?: string | null;
  // Extra fields for premium email layout (backward compatible)
  loanId?: string | null;
  loanAmount?: number | null;
  interestRate?: number | null;
  reminderDate?: Date | null;
}

export interface ChannelResult {
  channel: ChannelName;
  status: "SUCCESS" | "FAILED";
  response?: string;
}

// Every channel (live or stubbed) implements this interface so the reminder
// service can fan a reminder out to N channels uniformly.
export interface NotificationChannel {
  name: ChannelName;
  send(payload: ReminderPayload): Promise<ChannelResult>;
}
