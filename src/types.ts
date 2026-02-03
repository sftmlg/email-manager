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
  from?: string;  // Override From address (for aliases)
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
