import https from "https";
import { logger } from "../config/logger";

export interface BrevoAttachment {
  name: string;
  content: string; // base64 string
}

export interface BrevoEmailPayload {
  sender: { name: string; email: string };
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachment?: BrevoAttachment[];
}

export function sendBrevoEmail(apiKey: string, emailPayload: BrevoEmailPayload): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(emailPayload);

    const options = {
      hostname: "api.brevo.com",
      port: 443,
      path: "/v3/smtp/email",
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        "accept": "application/json",
        "content-length": Buffer.byteLength(postData)
      }
    };

    logger.info("Initiating Brevo REST API Request", {
      sender: emailPayload.sender.email,
      recipient: emailPayload.to[0]?.email,
      subject: emailPayload.subject,
      attachmentsCount: emailPayload.attachment?.length ?? 0
    });

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        let parsedData = {};
        try {
          parsedData = data ? JSON.parse(data) : {};
        } catch (e) {
          parsedData = { rawResponse: data };
        }

        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data: parsedData });
        } else {
          reject({ statusCode: res.statusCode, error: parsedData });
        }
      });
    });

    req.on("error", (e) => {
      reject({ statusCode: 0, error: e });
    });

    req.write(postData);
    req.end();
  });
}
