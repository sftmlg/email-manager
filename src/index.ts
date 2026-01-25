#!/usr/bin/env node
/**
 * Email Manager Tool
 *
 * Comprehensive utility for Gmail management:
 * - OAuth authentication
 * - Email fetching with attachments
 * - Send emails with attachments
 * - Create and manage drafts
 *
 * Usage:
 *   pnpm auth [personal|business]       - Authenticate with Gmail
 *   pnpm fetch [account] [dates]        - Fetch emails since last sync
 *   pnpm send <account> --to --subject --body [--attach] [--cc] [--bcc]
 *   pnpm draft <account> --to --subject --body [--attach] [--cc] [--bcc]
 *   pnpm drafts [account]               - List all drafts
 *   pnpm status                         - Show sync status
 */

import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { getAuthenticatedClient } from "./auth.js";
import { GmailClient } from "./gmail.js";
import { SyncStateManager } from "./sync-state.js";
import type { AccountConfig, SendEmailOptions, AttachmentFile, AttachmentInfo } from "./types.js";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.resolve(__dirname, "../../..");
const CREDENTIALS_PATH = path.join(ROOT_DIR, "credentials.json");
const METADATA_DIR = path.join(ROOT_DIR, "_metadata");
const SYNC_STATE_PATH = path.join(METADATA_DIR, "email-sync-state.json");
const OUTPUT_DIR = path.join(ROOT_DIR, "email-index");

// Account configurations - email will be populated after auth
const ACCOUNTS: Record<string, AccountConfig> = {
  personal: {
    name: "Personal",
    email: "",
    credentialsPath: CREDENTIALS_PATH,
    tokenPath: path.join(ROOT_DIR, "token-personal.json"),
  },
  business: {
    name: "Business",
    email: "",
    credentialsPath: CREDENTIALS_PATH,
    tokenPath: path.join(ROOT_DIR, "token-business.json"),
  },
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  // Ensure credentials exist
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    const files = fs.readdirSync(ROOT_DIR);
    const clientSecretFile = files.find(f => f.startsWith("client_secret_"));
    if (clientSecretFile) {
      fs.copyFileSync(
        path.join(ROOT_DIR, clientSecretFile),
        CREDENTIALS_PATH
      );
      console.log(`Copied ${clientSecretFile} to credentials.json`);
    } else {
      console.error("Error: credentials.json not found");
      console.error("Please download from Google Cloud Console and place in repository root");
      process.exit(1);
    }
  }

  switch (command) {
    case "auth":
      await authenticate(args[1] || "all");
      break;
    case "fetch":
      const forceIndex = args.indexOf("--force");
      const forceHistorical = forceIndex !== -1;
      const fetchArgs = forceHistorical ? args.filter((_, i) => i !== forceIndex) : args;
      await fetchEmails(fetchArgs[1] || "all", fetchArgs[2], fetchArgs[3], forceHistorical);
      break;
    case "send":
      await sendEmail(args.slice(1));
      break;
    case "draft":
      await createDraft(args.slice(1));
      break;
    case "drafts":
      await listDrafts(args[1] || "all");
      break;
    case "delete-draft":
      await deleteDraft(args[1], args[2]);
      break;
    case "status":
      showStatus();
      break;
    case "help":
    default:
      showHelp();
  }
}

async function authenticate(accountKey: string) {
  console.log("=== Gmail Authentication ===\n");

  const accounts = getAccounts(accountKey);

  for (const account of accounts) {
    try {
      console.log(`\nAuthenticating ${account.name}...`);
      const auth = await getAuthenticatedClient(account);
      const gmail = new GmailClient(auth, account.email);
      const profile = await gmail.getProfile();

      console.log(`\nAuthenticated as: ${profile.email}`);
      console.log(`Total messages: ${profile.messagesTotal.toLocaleString()}`);
      console.log(`Token saved to: ${account.tokenPath}`);
    } catch (error) {
      console.error(`Failed to authenticate ${account.name}:`, error);
    }
  }
}

async function fetchEmails(accountKey: string, startDateStr?: string, endDateStr?: string, forceHistorical: boolean = false) {
  console.log("=== Gmail Email Fetch ===\n");

  const startDate = startDateStr ? new Date(startDateStr) : new Date("2024-01-01");
  const endDate = endDateStr ? new Date(endDateStr) : new Date();

  if (forceHistorical) {
    console.log("Force historical mode: ignoring last sync date\n");
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(METADATA_DIR, { recursive: true });

  const syncState = new SyncStateManager(SYNC_STATE_PATH);
  const accounts = getAccounts(accountKey);

  const results: any[] = [];

  for (const account of accounts) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Fetching: ${account.name}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      const auth = await getAuthenticatedClient(account);
      const gmail = new GmailClient(auth, account.email);
      const profile = await gmail.getProfile();
      account.email = profile.email;

      console.log(`Connected as: ${profile.email}`);

      const lastSync = syncState.getLastSyncDate(account.email);
      // If forceHistorical is true, always use the requested startDate regardless of last sync
      const effectiveStart = (!forceHistorical && lastSync && lastSync > startDate) ? lastSync : startDate;

      if (lastSync) {
        console.log(`Last sync: ${lastSync.toISOString().split("T")[0]}`);
      }
      console.log(`Fetching from: ${effectiveStart.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`);

      const messages = await gmail.fetchMessages({
        account,
        startDate: effectiveStart,
        endDate: endDate,
      });

      console.log(`\nFound ${messages.length} messages`);

      let attachmentCount = 0;
      let emailCount = 0;

      for (const message of messages) {
        const relevantAttachments = message.attachments.filter(
          (att) => att.size >= 1000 &&
                   isRelevantMimeType(att.mimeType) &&
                   !isJunkAttachment(att.filename, att.size)
        );

        console.log(`\nProcessing: ${message.subject.substring(0, 60)}...`);

        const emailFolder = createEmailFolder(message, OUTPUT_DIR, account.name);
        saveEmailBody(message, emailFolder);
        emailCount++;

        for (const attachment of relevantAttachments) {
          try {
            let data: Buffer;

            // Check if this is an inline image with data already present
            if (attachment.id.startsWith("inline:") && attachment.inlineData) {
              // Inline image - data is already base64 encoded in inlineData
              data = Buffer.from(attachment.inlineData, "base64");
              console.log(`  Inline: ${attachment.filename} (${formatSize(data.length)})`);
            } else {
              // Standard attachment - fetch via API
              data = await gmail.downloadAttachment(message.id, attachment.id);
            }

            const savedPath = saveAttachmentToFolder(data, attachment, emailFolder);
            console.log(`  Saved: ${path.basename(savedPath)}`);
            attachmentCount++;
          } catch (error) {
            console.error(`  Error: ${attachment.filename}`, error);
          }
        }

        if (relevantAttachments.length === 0) {
          console.log(`  (no attachments)`);
        }
      }

      syncState.updateAccountState(account.email, {
        lastHistoryId: await gmail.getHistoryId(),
      });
      syncState.incrementStats(account.email, messages.length, attachmentCount);

      results.push({
        account: account.name,
        email: account.email,
        messagesProcessed: messages.length,
        attachmentsSaved: attachmentCount,
      });

      console.log(`\nCompleted ${account.name}: ${messages.length} messages, ${attachmentCount} attachments`);
    } catch (error) {
      console.error(`Error fetching ${account.name}:`, error);
    }
  }

  const summaryPath = path.join(OUTPUT_DIR, "_fetch_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify({
    fetchDate: new Date().toISOString(),
    dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
    results,
  }, null, 2));

  console.log("\n=== Fetch Complete ===");
  console.log(`Summary written to: ${summaryPath}`);
}

async function sendEmail(args: string[]) {
  console.log("=== Send Email ===\n");

  const accountKey = args[0];
  if (!accountKey || accountKey === "all") {
    console.error("Error: Please specify an account (personal or business)");
    process.exit(1);
  }

  const options = parseEmailOptions(args.slice(1));
  if (!options.to || !options.subject || !options.body) {
    console.error("Error: --to, --subject, and --body are required");
    showHelp();
    process.exit(1);
  }

  const account = ACCOUNTS[accountKey];
  if (!account) {
    console.error(`Unknown account: ${accountKey}`);
    process.exit(1);
  }

  try {
    const auth = await getAuthenticatedClient(account);
    const gmail = new GmailClient(auth, account.email);
    const profile = await gmail.getProfile();
    account.email = profile.email;

    console.log(`Sending from: ${profile.email}`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    if (options.attachments && options.attachments.length > 0) {
      console.log(`Attachments: ${options.attachments.length}`);
    }

    const messageId = await gmail.sendEmail(options);
    console.log(`\nEmail sent successfully!`);
    console.log(`Message ID: ${messageId}`);

    const syncState = new SyncStateManager(SYNC_STATE_PATH);
    syncState.incrementSentCount(account.email);
  } catch (error) {
    console.error("Error sending email:", error);
    process.exit(1);
  }
}

async function createDraft(args: string[]) {
  console.log("=== Create Draft ===\n");

  const accountKey = args[0];
  if (!accountKey || accountKey === "all") {
    console.error("Error: Please specify an account (personal or business)");
    process.exit(1);
  }

  const options = parseEmailOptions(args.slice(1));
  if (!options.to || !options.subject || !options.body) {
    console.error("Error: --to, --subject, and --body are required");
    showHelp();
    process.exit(1);
  }

  const account = ACCOUNTS[accountKey];
  if (!account) {
    console.error(`Unknown account: ${accountKey}`);
    process.exit(1);
  }

  try {
    const auth = await getAuthenticatedClient(account);
    const gmail = new GmailClient(auth, account.email);
    const profile = await gmail.getProfile();
    account.email = profile.email;

    console.log(`Creating draft for: ${profile.email}`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    if (options.attachments && options.attachments.length > 0) {
      console.log(`Attachments: ${options.attachments.length}`);
    }

    const draftId = await gmail.createDraft(options);
    console.log(`\nDraft created successfully!`);
    console.log(`Draft ID: ${draftId}`);

    const syncState = new SyncStateManager(SYNC_STATE_PATH);
    syncState.incrementDraftCount(account.email);
  } catch (error) {
    console.error("Error creating draft:", error);
    process.exit(1);
  }
}

async function deleteDraft(accountKey: string, draftId: string) {
  console.log("=== Delete Draft ===\n");

  if (!accountKey || accountKey === "all") {
    console.error("Error: Please specify an account (personal or business)");
    process.exit(1);
  }

  if (!draftId) {
    console.error("Error: Please specify a draft ID");
    console.error("Usage: pnpm delete-draft <account> <draft-id>");
    process.exit(1);
  }

  const account = ACCOUNTS[accountKey];
  if (!account) {
    console.error(`Unknown account: ${accountKey}`);
    process.exit(1);
  }

  try {
    const auth = await getAuthenticatedClient(account);
    const gmail = new GmailClient(auth, account.email);
    const profile = await gmail.getProfile();
    account.email = profile.email;

    console.log(`Deleting draft from: ${profile.email}`);
    console.log(`Draft ID: ${draftId}`);

    await gmail.deleteDraft(draftId);
    console.log(`\nDraft deleted successfully!`);
  } catch (error) {
    console.error("Error deleting draft:", error);
    process.exit(1);
  }
}

async function listDrafts(accountKey: string) {
  console.log("=== List Drafts ===\n");

  const accounts = getAccounts(accountKey);

  for (const account of accounts) {
    try {
      const auth = await getAuthenticatedClient(account);
      const gmail = new GmailClient(auth, account.email);
      const profile = await gmail.getProfile();
      account.email = profile.email;

      console.log(`\nAccount: ${profile.email}`);
      const drafts = await gmail.listDrafts();

      if (drafts.length === 0) {
        console.log("  No drafts found");
        continue;
      }

      console.log(`  Found ${drafts.length} drafts:\n`);
      for (const draft of drafts) {
        console.log(`  ID: ${draft.id}`);
        console.log(`  Subject: ${draft.message.subject}`);
        console.log(`  To: ${draft.message.to}`);
        console.log(`  Date: ${draft.message.date.toISOString()}`);
        console.log("");
      }
    } catch (error) {
      console.error(`Error listing drafts for ${account.name}:`, error);
    }
  }
}

function showStatus() {
  const syncState = new SyncStateManager(SYNC_STATE_PATH);
  syncState.printStatus();
}

function showHelp() {
  console.log(`
Email Manager - Gmail Integration Tool for Claude Code

This tool handles OAuth authentication, email fetching, sending, and draft management.

Usage:
  pnpm auth [personal|business|all]
  pnpm fetch [personal|business|all] [start-date] [end-date]
  pnpm send <account> --to <email> --subject <text> --body <text> [options]
  pnpm draft <account> --to <email> --subject <text> --body <text> [options]
  pnpm drafts [personal|business|all]
  pnpm status

Commands:
  auth <account>              Authenticate with Gmail (opens browser)
  fetch <account> [dates]     Fetch emails and save attachments
  send <account> [options]    Send an email
  draft <account> [options]   Create a draft email
  drafts [account]            List all drafts
  delete-draft <account> <id> Delete a draft by ID
  status                      Show sync status
  help                        Show this help

Send/Draft Options:
  --to <email>                Recipient email (required)
  --subject <text>            Email subject (required)
  --body <text>               Email body (required)
  --cc <email>                CC recipients (optional)
  --bcc <email>               BCC recipients (optional)
  --attach <file>             Attach file (can be used multiple times)

Arguments:
  account     personal, business, or all (default: all)
  start-date  YYYY-MM-DD format (default: 2024-01-01)
  end-date    YYYY-MM-DD format (default: today)

Examples:
  pnpm auth personal
  pnpm fetch business
  pnpm send personal --to "john@example.com" --subject "Hello" --body "Test message"
  pnpm send personal --to "john@example.com" --subject "Report" --body "See attached" --attach report.pdf
  pnpm draft business --to "client@example.com" --subject "Proposal" --body "Draft proposal"
  pnpm drafts personal

Output:
  Emails saved to: email-index/
  Sync state stored in: _metadata/email-sync-state.json

OAuth Redirect: http://127.0.0.1:5066
`);
}

function getAccounts(key: string): AccountConfig[] {
  if (key === "all") {
    return Object.values(ACCOUNTS);
  }
  const account = ACCOUNTS[key];
  if (!account) {
    console.error(`Unknown account: ${key}`);
    console.error("Available: personal, business, all");
    process.exit(1);
  }
  return [account];
}

function parseEmailOptions(args: string[]): SendEmailOptions {
  const options: SendEmailOptions = {
    to: "",
    subject: "",
    body: "",
  };

  const attachments: AttachmentFile[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--to":
        options.to = nextArg;
        i++;
        break;
      case "--subject":
        options.subject = nextArg;
        i++;
        break;
      case "--body":
        options.body = nextArg;
        i++;
        break;
      case "--cc":
        options.cc = nextArg;
        i++;
        break;
      case "--bcc":
        options.bcc = nextArg;
        i++;
        break;
      case "--attach":
        if (fs.existsSync(nextArg)) {
          const content = fs.readFileSync(nextArg);
          const filename = path.basename(nextArg);
          const mimeType = getMimeType(filename);
          attachments.push({ filename, mimeType, content });
        } else {
          console.error(`Warning: Attachment not found: ${nextArg}`);
        }
        i++;
        break;
    }
  }

  if (attachments.length > 0) {
    options.attachments = attachments;
  }

  return options;
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".txt": "text/plain",
    ".html": "text/html",
    ".json": "application/json",
    ".zip": "application/zip",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function isRelevantMimeType(mimeType: string): boolean {
  const relevant = [
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    // Images
    "image/png",
    "image/jpeg",
    "image/tiff",
    "image/gif",
    "image/webp",
    "image/bmp",
    // Text files
    "text/plain",
    "text/csv",
    "text/html",
    // Archives
    "application/zip",
    "application/x-zip-compressed",
    // Other common formats
    "application/json",
    "application/xml",
  ];
  return relevant.some((r) => mimeType.toLowerCase().includes(r.toLowerCase()));
}

// Patterns for definite junk (logos, spacers, tracking pixels)
const JUNK_PATTERNS = [
  /^icon(_\d+)?\.(png|jpg|gif)$/i,
  /^atl-generated-/i,
  /^prestashop-logo/i,
  /cidForSAP/i,
  /^logo\.(png|jpg|gif)$/i,
  /^spacer\.(gif|png)$/i,
  /^pixel\.(gif|png)$/i,
  /^tracking\.(gif|png)$/i,
  /^signature[_-]?/i,
];

// Patterns that are junk ONLY if small (< 10KB) - these could be real content if larger
const SIZE_DEPENDENT_PATTERNS = [
  /^image\d{3}\.(png|jpg|jpeg|gif)$/i,  // image001.png etc - often signatures but could be content
  /^embedded_/i,                          // embedded images
];

function isJunkAttachment(filename: string, size: number): boolean {
  // Tiny images are almost always tracking pixels or spacers
  if (size < 500 && /\.(png|gif|jpg|jpeg)$/i.test(filename)) return true;

  // Definite junk patterns (regardless of size up to 50KB)
  if (size < 50 * 1024) {
    for (const pattern of JUNK_PATTERNS) {
      if (pattern.test(filename)) return true;
    }
  }

  // Size-dependent patterns: only junk if small (< 10KB)
  // Larger files with these names are likely actual content
  if (size < 10 * 1024) {
    for (const pattern of SIZE_DEPENDENT_PATTERNS) {
      if (pattern.test(filename)) return true;
    }
  }

  return false;
}

function createEmailFolder(message: any, outputDir: string, accountName: string): string {
  const accountDir = path.join(outputDir, accountName.toLowerCase());

  const year = message.date.getFullYear().toString();
  const month = String(message.date.getMonth() + 1).padStart(2, "0");

  const datePrefix = formatDatePrefix(message.date);

  const subjectSlug = message.subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40);

  const shortId = message.id.substring(0, 8);
  const folderName = `${datePrefix}_${subjectSlug}_${shortId}`;

  const folderPath = path.join(accountDir, year, month, folderName);
  fs.mkdirSync(folderPath, { recursive: true });

  return folderPath;
}

function saveEmailBody(message: any, folderPath: string): void {
  const emailContent = `From: ${message.from}
To: ${message.to}
Date: ${message.date.toISOString()}
Subject: ${message.subject}

${message.body || "(No text content)"}
`;

  fs.writeFileSync(path.join(folderPath, "_email.txt"), emailContent);

  fs.writeFileSync(path.join(folderPath, "_email.meta.json"), JSON.stringify({
    messageId: message.id,
    threadId: message.threadId,
    subject: message.subject,
    from: message.from,
    to: message.to,
    date: message.date.toISOString(),
    labels: message.labels,
    snippet: message.snippet,
    attachmentCount: message.attachments.length,
    fetchedAt: new Date().toISOString(),
  }, null, 2));
}

function saveAttachmentToFolder(data: Buffer, attachment: AttachmentInfo, folderPath: string): string {
  const safeFilename = attachment.filename
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_");

  const targetPath = path.join(folderPath, safeFilename);
  const uniquePath = getUniquePath(targetPath);

  fs.writeFileSync(uniquePath, data);

  return uniquePath;
}

function formatDatePrefix(date: Date): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function getUniquePath(filepath: string): string {
  if (!fs.existsSync(filepath)) return filepath;

  const dir = path.dirname(filepath);
  const ext = path.extname(filepath);
  const base = path.basename(filepath, ext);

  let counter = 1;
  let newPath: string;
  do {
    newPath = path.join(dir, `${base}_${counter}${ext}`);
    counter++;
  } while (fs.existsSync(newPath));

  return newPath;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

main().catch(console.error);
