import type { gmail_v1 } from "googleapis";

export interface AccountConfig {
  name: string;
  email: string;
  credentialsPath: string;
  tokenPath: string;
}

export interface SyncState {
  accounts: {
    [email: string]: AccountSyncState;
  };
}

export interface AccountSyncState {
  lastSyncDate: string;
  lastHistoryId?: string;
  totalFetched: number;
  attachmentsSaved: number;
  emailsSent: number;
  draftsCreated: number;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  snippet: string;
  labels: string[];
  attachments: AttachmentInfo[];
  body?: string;
  messageIdHeader?: string;   // RFC 2822 Message-ID header
  referencesHeader?: string;  // RFC 2822 References header
}

export interface AttachmentInfo {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  inlineData?: string;  // Base64-encoded data for inline/embedded images
}

export interface FetchOptions {
  account: AccountConfig;
  startDate: Date;
  endDate?: Date;
  maxResults?: number;
  query?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string;
  bcc?: string;
  threadId?: string;      // Gmail thread ID for threaded replies
  inReplyTo?: string;     // RFC 2822 Message-ID of the message being replied to
  references?: string;    // RFC 2822 References header chain
  attachments?: AttachmentFile[];
}

export interface AttachmentFile {
  filename: string;
  mimeType: string;
  content: Buffer;
}

export interface DraftInfo {
  id: string;
  message: EmailMessage;
}
