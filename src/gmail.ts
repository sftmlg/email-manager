import { google, gmail_v1 } from "googleapis";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;
import * as fs from "fs";
import * as path from "path";
import { simpleParser } from "mailparser";
import type {
  EmailMessage,
  AttachmentInfo,
  FetchOptions,
  SendEmailOptions,
  AttachmentFile,
  DraftInfo,
} from "./types.js";

export class GmailClient {
  private gmail: gmail_v1.Gmail;
  private userEmail: string;

  constructor(auth: OAuth2Client, userEmail: string) {
    this.gmail = google.gmail({ version: "v1", auth });
    this.userEmail = userEmail;
  }

  async fetchMessages(options: FetchOptions): Promise<EmailMessage[]> {
    const messages: EmailMessage[] = [];
    let pageToken: string | undefined;

    // Build query
    const queryParts: string[] = [];

    if (options.startDate) {
      const dateStr = formatDateForQuery(options.startDate);
      queryParts.push(`after:${dateStr}`);
    }

    if (options.endDate) {
      const dateStr = formatDateForQuery(options.endDate);
      queryParts.push(`before:${dateStr}`);
    }

    if (options.query) {
      queryParts.push(options.query);
    }

    const query = queryParts.join(" ");
    console.log(`Fetching emails with query: ${query}`);

    do {
      const response = await this.gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: Math.min(options.maxResults || 100, 100),
        pageToken,
      });

      if (response.data.messages) {
        for (const msg of response.data.messages) {
          if (options.maxResults && messages.length >= options.maxResults) {
            break;
          }

          const fullMessage = await this.getMessage(msg.id!);
          if (fullMessage) {
            messages.push(fullMessage);
          }
        }
      }

      pageToken = response.data.nextPageToken || undefined;

      if (options.maxResults && messages.length >= options.maxResults) {
        break;
      }
    } while (pageToken);

    return messages;
  }

  async getMessage(messageId: string): Promise<EmailMessage | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const message = response.data;
      const headers = message.payload?.headers || [];

      const getHeader = (name: string): string => {
        const header = headers.find(
          (h) => h.name?.toLowerCase() === name.toLowerCase()
        );
        return header?.value || "";
      };

      const attachments = this.extractAttachments(message.payload);

      return {
        id: message.id!,
        threadId: message.threadId!,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        to: getHeader("To"),
        date: new Date(parseInt(message.internalDate || "0")),
        snippet: message.snippet || "",
        labels: message.labelIds || [],
        attachments,
        body: this.extractBody(message.payload),
        messageIdHeader: getHeader("Message-ID") || getHeader("Message-Id"),
        referencesHeader: getHeader("References"),
      };
    } catch (error) {
      console.error(`Error fetching message ${messageId}:`, error);
      return null;
    }
  }

  private extractAttachments(
    payload: gmail_v1.Schema$MessagePart | undefined
  ): AttachmentInfo[] {
    const attachments: AttachmentInfo[] = [];

    if (!payload) return attachments;

    const extractFromParts = (parts: gmail_v1.Schema$MessagePart[]) => {
      for (const part of parts) {
        // Case 1: Standard attachment with attachmentId (fetched via API)
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType || "application/octet-stream",
            size: part.body.size || 0,
          });
        }
        // Case 2: Inline/embedded images with data directly in body (CID images)
        // These have filename but data is in body.data, not via attachmentId
        else if (part.filename && part.body?.data && part.mimeType?.startsWith("image/")) {
          // Generate a unique ID for inline images using Content-ID or hash
          const contentIdHeader = part.headers?.find(h => h.name?.toLowerCase() === "content-id");
          const contentId = contentIdHeader?.value?.replace(/[<>]/g, "") || `inline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          attachments.push({
            id: `inline:${contentId}`,  // Mark as inline with special prefix
            filename: part.filename,
            mimeType: part.mimeType || "image/png",
            size: part.body.size || part.body.data.length,
            inlineData: part.body.data,  // Store the base64 data directly
          });
        }
        // Case 3: Image parts without filename but with CID reference (embedded)
        else if (part.mimeType?.startsWith("image/") && part.body?.data && !part.filename) {
          const contentIdHeader = part.headers?.find(h => h.name?.toLowerCase() === "content-id");
          if (contentIdHeader?.value) {
            const contentId = contentIdHeader.value.replace(/[<>]/g, "");
            // Generate filename from content-id or mime type
            const ext = part.mimeType.split("/")[1] || "png";
            const filename = `embedded_${contentId}.${ext}`;

            attachments.push({
              id: `inline:${contentId}`,
              filename: filename,
              mimeType: part.mimeType,
              size: part.body.size || part.body.data.length,
              inlineData: part.body.data,
            });
          }
        }

        if (part.parts) {
          extractFromParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      extractFromParts(payload.parts);
    } else if (payload.filename && payload.body?.attachmentId) {
      attachments.push({
        id: payload.body.attachmentId,
        filename: payload.filename,
        mimeType: payload.mimeType || "application/octet-stream",
        size: payload.body.size || 0,
      });
    }

    return attachments;
  }

  private extractBody(
    payload: gmail_v1.Schema$MessagePart | undefined
  ): string {
    if (!payload) return "";

    const extractText = (part: gmail_v1.Schema$MessagePart): string => {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
      if (part.parts) {
        for (const subpart of part.parts) {
          const text = extractText(subpart);
          if (text) return text;
        }
      }
      return "";
    };

    return extractText(payload);
  }

  async downloadAttachment(
    messageId: string,
    attachmentId: string
  ): Promise<Buffer> {
    const response = await this.gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    if (!response.data.data) {
      throw new Error("No attachment data received");
    }

    return Buffer.from(response.data.data, "base64");
  }

  async sendEmail(options: SendEmailOptions): Promise<string> {
    const message = this.createMimeMessage(options);

    const response = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: message,
      },
    });

    return response.data.id!;
  }

  async createDraft(options: SendEmailOptions): Promise<string> {
    const message = this.createMimeMessage(options);

    const requestBody: any = {
      message: {
        raw: message,
      },
    };

    if (options.threadId) {
      requestBody.message.threadId = options.threadId;
    }

    const response = await this.gmail.users.drafts.create({
      userId: "me",
      requestBody,
    });

    return response.data.id!;
  }

  async updateDraft(draftId: string, options: SendEmailOptions): Promise<string> {
    const message = this.createMimeMessage(options);

    const requestBody: any = {
      message: {
        raw: message,
      },
    };

    if (options.threadId) {
      requestBody.message.threadId = options.threadId;
    }

    const response = await this.gmail.users.drafts.update({
      userId: "me",
      id: draftId,
      requestBody,
    });

    return response.data.id!;
  }

  async listDrafts(): Promise<DraftInfo[]> {
    const response = await this.gmail.users.drafts.list({
      userId: "me",
    });

    if (!response.data.drafts) {
      return [];
    }

    const drafts: DraftInfo[] = [];
    for (const draft of response.data.drafts) {
      if (draft.id && draft.message?.id) {
        const message = await this.getMessage(draft.message.id);
        if (message) {
          drafts.push({
            id: draft.id,
            message,
          });
        }
      }
    }

    return drafts;
  }

  async sendDraft(draftId: string): Promise<string> {
    const response = await this.gmail.users.drafts.send({
      userId: "me",
      requestBody: {
        id: draftId,
      },
    });

    return response.data.id || draftId;
  }

  async deleteDraft(draftId: string): Promise<void> {
    await this.gmail.users.drafts.delete({
      userId: "me",
      id: draftId,
    });
  }

  private encodeSubject(subject: string): string {
    // Check if subject contains non-ASCII characters
    if (/[^\x00-\x7F]/.test(subject)) {
      // RFC 2047 encoded-word syntax for UTF-8
      const encoded = Buffer.from(subject, 'utf-8').toString('base64');
      return `=?UTF-8?B?${encoded}?=`;
    }
    return subject;
  }

  private createMimeMessage(options: SendEmailOptions): string {
    const boundary = "boundary_" + Date.now();
    const nl = "\r\n";

    const fromAddress = options.from || this.userEmail;
    let message = [
      `From: ${fromAddress}`,
      `To: ${options.to}`,
    ];

    if (options.cc) {
      message.push(`Cc: ${options.cc}`);
    }

    if (options.bcc) {
      message.push(`Bcc: ${options.bcc}`);
    }

    message.push(`Subject: ${this.encodeSubject(options.subject)}`);

    if (options.inReplyTo) {
      message.push(`In-Reply-To: ${options.inReplyTo}`);
    }
    if (options.references) {
      message.push(`References: ${options.references}`);
    }

    message.push(`MIME-Version: 1.0`);

    if (options.attachments && options.attachments.length > 0) {
      // Multipart message with attachments
      message.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      message.push("");
      message.push(`--${boundary}`);
      message.push(`Content-Type: text/plain; charset="UTF-8"`);
      message.push(`Content-Transfer-Encoding: 7bit`);
      message.push("");
      message.push(options.body);

      // Add attachments
      for (const attachment of options.attachments) {
        message.push("");
        message.push(`--${boundary}`);
        message.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
        message.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        message.push(`Content-Transfer-Encoding: base64`);
        message.push("");
        message.push(attachment.content.toString("base64"));
      }

      message.push("");
      message.push(`--${boundary}--`);
    } else {
      // Simple text message
      message.push(`Content-Type: text/plain; charset="UTF-8"`);
      message.push("");
      message.push(options.body);
    }

    const fullMessage = message.join(nl);
    return Buffer.from(fullMessage).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async getProfile(): Promise<{ email: string; messagesTotal: number }> {
    const response = await this.gmail.users.getProfile({ userId: "me" });
    return {
      email: response.data.emailAddress || "",
      messagesTotal: response.data.messagesTotal || 0,
    };
  }

  async getHistoryId(): Promise<string | undefined> {
    const response = await this.gmail.users.messages.list({
      userId: "me",
      maxResults: 1,
    });
    if (response.data.messages?.[0]?.id) {
      const msg = await this.gmail.users.messages.get({
        userId: "me",
        id: response.data.messages[0].id,
        format: "minimal",
      });
      return msg.data.historyId || undefined;
    }
    return undefined;
  }

  /**
   * Parse an .eml file (RFC 822 message) and extract readable content
   * @param emlBuffer Buffer containing the .eml file data
   * @returns Formatted text summary of the email
   */
  async parseEmlFile(emlBuffer: Buffer): Promise<string> {
    try {
      const parsed = await simpleParser(emlBuffer);

      const lines: string[] = [];
      lines.push("=== Forwarded Email ===");
      lines.push("");

      if (parsed.from) {
        const fromObj = Array.isArray(parsed.from) ? parsed.from[0] : parsed.from;
        const fromAddress = fromObj?.value?.[0]?.address || fromObj?.text || "";
        const fromName = fromObj?.value?.[0]?.name || "";
        lines.push(`From: ${fromName ? `${fromName} <${fromAddress}>` : fromAddress}`);
      }

      if (parsed.to) {
        const toObj = Array.isArray(parsed.to) ? parsed.to[0] : parsed.to;
        const toAddresses = Array.isArray(toObj?.value)
          ? toObj.value.map((addr: any) => addr.address || addr.text).join(", ")
          : toObj?.text || "";
        lines.push(`To: ${toAddresses}`);
      }

      if (parsed.cc) {
        const ccObj = Array.isArray(parsed.cc) ? parsed.cc[0] : parsed.cc;
        const ccAddresses = Array.isArray(ccObj?.value)
          ? ccObj.value.map((addr: any) => addr.address || addr.text).join(", ")
          : ccObj?.text || "";
        lines.push(`Cc: ${ccAddresses}`);
      }

      if (parsed.date) {
        lines.push(`Date: ${parsed.date.toISOString()}`);
      }

      if (parsed.subject) {
        lines.push(`Subject: ${parsed.subject}`);
      }

      lines.push("");
      lines.push("--- Message Body ---");
      lines.push("");

      // Extract text content (prefer plain text, fallback to HTML stripped)
      if (parsed.text) {
        lines.push(parsed.text.trim());
      } else if (parsed.html) {
        // Basic HTML stripping - remove tags but keep content
        const stripped = parsed.html
          .replace(/<style[^>]*>.*?<\/style>/gis, "")
          .replace(/<script[^>]*>.*?<\/script>/gis, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        lines.push(stripped);
      } else {
        lines.push("(No text content)");
      }

      // List attachments if any
      if (parsed.attachments && parsed.attachments.length > 0) {
        lines.push("");
        lines.push("--- Attachments ---");
        for (const att of parsed.attachments) {
          lines.push(`- ${att.filename || "unnamed"} (${att.contentType}, ${att.size} bytes)`);
        }
      }

      return lines.join("\n");
    } catch (error) {
      console.error("Error parsing EML file:", error);
      return `Error parsing .eml file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

function formatDateForQuery(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
