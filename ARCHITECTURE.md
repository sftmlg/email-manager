# Email Manager - Architecture Document

## Overview

Email Manager is a comprehensive CLI tool for Gmail integration, extending the existing email-fetcher capabilities with bidirectional communication (send, draft, reply) while maintaining the same OAuth authentication pattern.

**Design Philosophy**: Reliability-first backend architecture with robust error handling, data integrity, and audit trails.

---

## 1. File Structure

```
email-manager/
├── package.json                    # Project metadata and dependencies
├── tsconfig.json                   # TypeScript configuration
├── .gitignore                      # Ignore tokens, credentials, node_modules
├── README.md                       # Usage documentation
├── ARCHITECTURE.md                 # This file
│
├── src/
│   ├── index.ts                    # CLI entry point and command router
│   ├── types.ts                    # TypeScript interfaces and type definitions
│   │
│   ├── auth/
│   │   ├── auth.ts                # OAuth2 authentication (enhanced from email-fetcher)
│   │   └── scopes.ts              # Gmail API scope definitions
│   │
│   ├── gmail/
│   │   ├── client.ts              # GmailClient class (enhanced from email-fetcher)
│   │   ├── fetch.ts               # Email fetching operations
│   │   ├── send.ts                # Email sending operations
│   │   ├── draft.ts               # Draft management operations
│   │   ├── reply.ts               # Reply operations
│   │   └── attachment.ts          # Attachment handling (upload/download)
│   │
│   ├── commands/
│   │   ├── auth.ts                # Authentication command handler
│   │   ├── fetch.ts               # Fetch command handler
│   │   ├── send.ts                # Send command handler
│   │   ├── draft.ts               # Draft command handlers (create/list)
│   │   └── reply.ts               # Reply command handler
│   │
│   ├── utils/
│   │   ├── sync-state.ts          # Sync state management (from email-fetcher)
│   │   ├── logger.ts              # Structured logging utility
│   │   ├── validation.ts          # Input validation helpers
│   │   └── email-parser.ts        # Email format parsing and sanitization
│   │
│   └── config/
│       ├── accounts.ts            # Account configuration management
│       └── paths.ts               # File path constants
│
└── examples/
    ├── send-invoice-example.sh    # Example: Send invoice via email
    └── draft-template.json        # Example: Draft email template
```

---

## 2. Gmail API Scopes

### Current Scope (email-fetcher)
```typescript
const SCOPES_READONLY = [
  'https://www.googleapis.com/auth/gmail.readonly'
];
```

### Enhanced Scopes (email-manager)
```typescript
const SCOPES_FULL = [
  'https://www.googleapis.com/auth/gmail.readonly',    // Read emails and attachments
  'https://www.googleapis.com/auth/gmail.send',        // Send emails
  'https://www.googleapis.com/auth/gmail.compose',     // Create and modify drafts
  'https://www.googleapis.com/auth/gmail.modify'       // Modify messages (for reply threading)
];
```

**Migration Strategy**:
- Existing tokens with `gmail.readonly` will require re-authentication
- New token files: `token-personal-full.json`, `token-business-full.json`
- CLI will detect insufficient scopes and prompt for re-auth

---

## 3. CLI Command Interface

### Authentication
```bash
# Authenticate accounts (opens browser for OAuth flow)
email-manager auth personal
email-manager auth business
email-manager auth all
```

### Fetch (Existing - from email-fetcher)
```bash
# Fetch emails with date range
email-manager fetch personal 2024-01-01 2024-12-31
email-manager fetch business
email-manager fetch all
```

### Send Email
```bash
# Send email with inline body
email-manager send personal \
  --to "client@example.com" \
  --subject "Invoice for December 2024" \
  --body "Please find attached the invoice." \
  --attach "/path/to/invoice.pdf"

# Send email from file template
email-manager send business \
  --to "partner@company.com" \
  --template "./templates/proposal.json"

# Multiple recipients and attachments
email-manager send personal \
  --to "client1@example.com,client2@example.com" \
  --cc "manager@example.com" \
  --bcc "archive@example.com" \
  --subject "Project Update" \
  --body "See attached documents" \
  --attach "report.pdf,screenshots.zip"
```

### Create Draft
```bash
# Create draft (same syntax as send)
email-manager draft personal \
  --to "prospect@company.com" \
  --subject "Collaboration Opportunity" \
  --body "Draft message content" \
  --attach "proposal.pdf"
```

### List Drafts
```bash
# List all drafts for account
email-manager drafts personal
email-manager drafts business
```

### Reply to Email
```bash
# Reply to message by ID (maintains thread)
email-manager reply personal <message-id> \
  --body "Thank you for your email. I will review and respond shortly."

# Reply with attachment
email-manager reply business <message-id> \
  --body "Please find the requested document attached." \
  --attach "document.pdf"
```

### Status
```bash
# Show sync status and account info
email-manager status
```

---

## 4. Key Functions and Signatures

### Authentication Module (`src/auth/auth.ts`)

```typescript
/**
 * Get authenticated OAuth2 client with required scopes
 * Handles token refresh and re-authentication if scopes insufficient
 */
export async function getAuthenticatedClient(
  account: AccountConfig,
  requiredScopes: string[]
): Promise<OAuth2Client>

/**
 * Check if existing token has required scopes
 */
export function hasRequiredScopes(
  token: TokenInfo,
  requiredScopes: string[]
): boolean

/**
 * Revoke and delete authentication token
 */
export async function revokeToken(account: AccountConfig): Promise<void>
```

### Gmail Client (`src/gmail/client.ts`)

```typescript
export class GmailClient {
  constructor(auth: OAuth2Client, userEmail: string);

  // Existing methods (from email-fetcher)
  async fetchMessages(options: FetchOptions): Promise<EmailMessage[]>
  async getMessage(messageId: string): Promise<EmailMessage | null>
  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer>
  async getProfile(): Promise<ProfileInfo>
  async getHistoryId(): Promise<string | undefined>

  // New methods for email-manager
  async sendEmail(message: OutgoingEmail): Promise<SendResult>
  async createDraft(message: OutgoingEmail): Promise<DraftResult>
  async listDrafts(maxResults?: number): Promise<Draft[]>
  async getDraft(draftId: string): Promise<Draft>
  async updateDraft(draftId: string, message: OutgoingEmail): Promise<DraftResult>
  async deleteDraft(draftId: string): Promise<void>
  async replyToMessage(messageId: string, reply: ReplyMessage): Promise<SendResult>
}
```

### Send Operations (`src/gmail/send.ts`)

```typescript
/**
 * Send email with optional attachments
 * Returns message ID and thread ID
 */
export async function sendEmail(
  gmail: gmail_v1.Gmail,
  message: OutgoingEmail
): Promise<SendResult>

/**
 * Build RFC 2822 formatted email message with MIME multipart
 */
export function buildEmailMessage(message: OutgoingEmail): string

/**
 * Encode email for Gmail API (base64url)
 */
export function encodeEmail(rawEmail: string): string
```

### Draft Operations (`src/gmail/draft.ts`)

```typescript
/**
 * Create new draft email
 */
export async function createDraft(
  gmail: gmail_v1.Gmail,
  message: OutgoingEmail
): Promise<DraftResult>

/**
 * List drafts with pagination
 */
export async function listDrafts(
  gmail: gmail_v1.Gmail,
  maxResults?: number,
  pageToken?: string
): Promise<DraftListResult>

/**
 * Update existing draft
 */
export async function updateDraft(
  gmail: gmail_v1.Gmail,
  draftId: string,
  message: OutgoingEmail
): Promise<DraftResult>

/**
 * Delete draft by ID
 */
export async function deleteDraft(
  gmail: gmail_v1.Gmail,
  draftId: string
): Promise<void>
```

### Reply Operations (`src/gmail/reply.ts`)

```typescript
/**
 * Reply to existing message (maintains thread)
 * Automatically sets In-Reply-To and References headers
 */
export async function replyToMessage(
  gmail: gmail_v1.Gmail,
  originalMessageId: string,
  reply: ReplyMessage
): Promise<SendResult>

/**
 * Extract reply metadata from original message
 */
export async function getReplyMetadata(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<ReplyMetadata>

/**
 * Build reply headers (In-Reply-To, References, Subject with Re:)
 */
export function buildReplyHeaders(
  originalMessage: EmailMessage,
  replyBody: string
): ReplyHeaders
```

### Attachment Handling (`src/gmail/attachment.ts`)

```typescript
/**
 * Upload attachment and return MIME part
 * Supports: PDF, DOCX, XLSX, images, zip archives
 */
export async function attachFile(
  filePath: string
): Promise<AttachmentPart>

/**
 * Download attachment from message (existing from email-fetcher)
 */
export async function downloadAttachment(
  gmail: gmail_v1.Gmail,
  messageId: string,
  attachmentId: string
): Promise<Buffer>

/**
 * Validate attachment (size limits, allowed types)
 * Gmail limit: 25MB per email
 */
export function validateAttachment(filePath: string): ValidationResult
```

### Type Definitions (`src/types.ts`)

```typescript
// Existing types from email-fetcher
export interface AccountConfig {
  name: string;
  email: string;
  credentialsPath: string;
  tokenPath: string;
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

// New types for email-manager
export interface OutgoingEmail {
  to: string | string[];              // Recipient(s)
  cc?: string | string[];              // CC recipients
  bcc?: string | string[];             // BCC recipients
  subject: string;                     // Email subject
  body: string;                        // Plain text or HTML body
  bodyType?: 'text' | 'html';          // Body content type
  attachments?: string[];              // File paths to attach
  replyTo?: string;                    // Reply-To header
  inReplyTo?: string;                  // In-Reply-To header (for threading)
  references?: string[];               // References header (for threading)
}

export interface SendResult {
  messageId: string;                   // Sent message ID
  threadId: string;                    // Thread ID
  labelIds: string[];                  // Applied labels
  sentAt: Date;                        // Timestamp
}

export interface Draft {
  id: string;                          // Draft ID
  message: EmailMessage;               // Draft content
  createdAt: Date;                     // Creation timestamp
  updatedAt: Date;                     // Last modified timestamp
}

export interface DraftResult {
  draftId: string;                     // Created/updated draft ID
  messageId: string;                   // Message ID
}

export interface ReplyMessage {
  body: string;                        // Reply body text
  bodyType?: 'text' | 'html';          // Reply body type
  attachments?: string[];              // Attachments for reply
}

export interface ReplyMetadata {
  threadId: string;                    // Thread to reply in
  messageId: string;                   // Original message ID
  subject: string;                     // Original subject
  from: string;                        // Original sender
  to: string;                          // Original recipient
  references: string[];                // Email reference chain
}

export interface AttachmentPart {
  filename: string;
  mimeType: string;
  data: string;                        // Base64 encoded
  size: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;                      // Error message if invalid
}
```

---

## 5. Integration with Existing Tools

### Integration with drive-manager

**Use Case**: Upload invoices to Google Drive after sending via email

```typescript
// Workflow: Generate → Send → Upload to Drive
// 1. Generate invoice (invoice-generator)
// 2. Send invoice via email (email-manager)
// 3. Upload sent invoice to Drive folder (drive-manager)

// Example integration script
async function sendAndArchiveInvoice(invoicePath: string) {
  // Send via email
  const sendResult = await emailManager.send('business', {
    to: 'client@example.com',
    subject: 'Invoice INV-2024-001',
    body: 'Please find your invoice attached.',
    attachments: [invoicePath]
  });

  // Upload to Drive (invoices folder)
  await driveManager.upload(invoicePath, {
    folderId: 'invoices-2024',
    description: `Sent to client@example.com on ${sendResult.sentAt}`
  });
}
```

**Shared Authentication Pattern**:
- Both tools use Google OAuth2 with similar flow
- Could share credentials.json but use separate token files
- drive-manager uses `drive.file` scope
- email-manager uses `gmail.*` scopes

### Integration with invoice-generator

**Use Case**: Generate PDF invoice and send via email in one workflow

```typescript
// Workflow: Generate → Send
// 1. Generate PDF invoice (invoice-generator)
// 2. Send invoice via email (email-manager)

// Example integration script
async function generateAndSendInvoice(invoiceData: InvoiceData, recipient: string) {
  // Generate invoice PDF
  const invoicePath = await invoiceGenerator.generate({
    invoiceNumber: 'INV-2024-001',
    client: invoiceData.client,
    items: invoiceData.items,
    outputPath: './invoices/INV-2024-001.pdf'
  });

  // Send via email
  await emailManager.send('business', {
    to: recipient,
    subject: `Invoice ${invoiceData.invoiceNumber}`,
    body: generateInvoiceEmailBody(invoiceData),
    attachments: [invoicePath]
  });
}

function generateInvoiceEmailBody(data: InvoiceData): string {
  return `
Dear ${data.client.name},

Please find attached invoice ${data.invoiceNumber} for the services provided.

Total Amount: €${data.total}
Due Date: ${data.dueDate}

Payment details are included in the attached PDF.

Best regards,
David Moling
  `.trim();
}
```

**Output Format Compatibility**:
- invoice-generator outputs PDF files
- email-manager accepts PDF attachments (validated MIME type)
- Both tools can share output directory structure

### Complete Workflow Example

```bash
#!/bin/bash
# Complete invoice workflow: Generate → Send → Archive

# 1. Generate invoice PDF
cd ../invoice-generator
npm run generate -- \
  --client "ACME Corp" \
  --amount 1500 \
  --output "./output/INV-2024-001.pdf"

# 2. Send invoice via email
cd ../email-manager
npm run send business -- \
  --to "billing@acme.com" \
  --subject "Invoice INV-2024-001 - December 2024" \
  --body "Please find attached your invoice for December 2024." \
  --attach "../invoice-generator/output/INV-2024-001.pdf"

# 3. Upload to Google Drive for archival
cd ../drive-manager
npm run upload -- \
  --file "../invoice-generator/output/INV-2024-001.pdf" \
  --folder "Invoices/2024" \
  --description "Sent to ACME Corp on $(date +%Y-%m-%d)"

echo "Invoice workflow complete!"
```

---

## 6. Security Considerations

### Authentication Security
- **OAuth2 Flow**: Use Google's recommended Desktop App OAuth flow
- **Token Storage**: Store tokens in user's home directory with 600 permissions
- **Scope Minimization**: Request only necessary scopes (no admin scopes)
- **Token Refresh**: Automatic token refresh before expiry

### Email Security
- **Input Validation**: Sanitize all user inputs (to, subject, body)
- **Email Address Validation**: RFC 5322 compliant validation
- **Attachment Validation**:
  - Size limit: 25MB (Gmail limit)
  - MIME type validation
  - Path traversal protection
- **HTML Injection Prevention**: Sanitize HTML body content
- **Rate Limiting**: Respect Gmail API quotas (10,000 emails/day for free accounts)

### Audit Trail
- **Send Log**: Log all sent emails with timestamps
- **Error Logging**: Structured error logs with context
- **Attachment Tracking**: Record attachment metadata for audit

### Data Protection
- **No Credential Logging**: Never log credentials or tokens
- **Sensitive Data Handling**: Don't store email bodies or attachments unless explicitly requested
- **Secure Deletion**: Securely delete draft data if requested

---

## 7. Error Handling Strategy

### Network Errors
```typescript
// Retry logic for transient failures
async function sendWithRetry(message: OutgoingEmail, maxRetries = 3): Promise<SendResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendEmail(message);
    } catch (error) {
      if (isRetriableError(error) && attempt < maxRetries) {
        await delay(exponentialBackoff(attempt));
        continue;
      }
      throw error;
    }
  }
}
```

### Authentication Errors
- **Token Expired**: Auto-refresh token
- **Insufficient Scopes**: Prompt user to re-authenticate with new scopes
- **Invalid Credentials**: Clear error message with setup instructions

### Validation Errors
- **Invalid Email Address**: RFC 5322 validation with clear error
- **Attachment Too Large**: Show size limit and suggest compression
- **Missing Required Fields**: Show example usage

### Gmail API Errors
- **Quota Exceeded**: Show daily limit and current usage
- **Message Not Found**: Handle gracefully (e.g., email deleted)
- **Permission Denied**: Check token scopes and re-auth if needed

---

## 8. Performance Optimization

### Attachment Handling
- **Streaming Upload**: Stream large files instead of loading into memory
- **Parallel Attachment Processing**: Process multiple attachments concurrently
- **MIME Encoding**: Efficient base64 encoding with chunking

### Batch Operations
- **Batch API Requests**: Use Gmail batch API for multiple operations
- **Concurrent Sends**: Send to multiple recipients in parallel (respect rate limits)

### Caching
- **Draft Cache**: Cache draft list to reduce API calls
- **Profile Cache**: Cache user profile info (email address, quotas)

---

## 9. Testing Strategy

### Unit Tests
- Authentication flow (mock OAuth)
- Email message building (RFC 2822 compliance)
- Attachment encoding
- Input validation

### Integration Tests
- Send email to test account
- Create and list drafts
- Reply to test thread
- Attachment upload/download

### Manual Testing Checklist
- [ ] Authenticate personal account
- [ ] Authenticate business account
- [ ] Send email with plain text body
- [ ] Send email with HTML body
- [ ] Send email with PDF attachment
- [ ] Send email with multiple attachments
- [ ] Create draft
- [ ] List drafts
- [ ] Reply to existing email (verify threading)
- [ ] Send to multiple recipients (To, CC, BCC)
- [ ] Validate attachment size limits
- [ ] Test token refresh flow
- [ ] Test insufficient scope handling

---

## 10. Migration Path from email-fetcher

### Phase 1: Core Infrastructure
1. Copy email-fetcher codebase to email-manager
2. Enhance authentication to support new scopes
3. Add send/compose scope handling
4. Update token file naming convention

### Phase 2: Send Capability
1. Implement `buildEmailMessage()` (RFC 2822 MIME)
2. Implement `sendEmail()` function
3. Add attachment handling
4. Create send command CLI handler

### Phase 3: Draft Management
1. Implement draft creation
2. Implement draft listing
3. Implement draft update/delete
4. Create draft command CLI handlers

### Phase 4: Reply Functionality
1. Implement reply metadata extraction
2. Implement threading headers (In-Reply-To, References)
3. Create reply command CLI handler

### Phase 5: Integration & Testing
1. Integration examples with invoice-generator
2. Integration examples with drive-manager
3. End-to-end workflow scripts
4. Documentation and examples

---

## 11. Dependencies

### Required NPM Packages
```json
{
  "dependencies": {
    "googleapis": "^144.0.0",    // Gmail API client
    "open": "^10.1.0",           // Open browser for OAuth
    "mime-types": "^2.1.35",     // MIME type detection
    "email-validator": "^2.0.4", // RFC 5322 email validation
    "html-to-text": "^9.0.5"     // HTML to plain text conversion
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

### External Services
- **Google Cloud Console**: OAuth2 credentials
- **Gmail API**: Email sending and management

---

## 12. Deployment & Usage

### Initial Setup
```bash
# 1. Install dependencies
cd email-manager
npm install

# 2. Configure Google Cloud OAuth credentials
# Download client_secret_*.json from Google Cloud Console
# Place as credentials.json in project root

# 3. Authenticate accounts
npm run auth personal
npm run auth business
```

### Daily Usage
```bash
# Send invoice to client
npm run send business -- \
  --to "client@example.com" \
  --subject "Invoice December 2024" \
  --body "Please find your invoice attached." \
  --attach "../invoices/INV-2024-001.pdf"

# Create draft for review
npm run draft personal -- \
  --to "prospect@company.com" \
  --subject "Proposal Discussion" \
  --body "Draft content here"

# Reply to inquiry
npm run reply business <message-id> -- \
  --body "Thank you for your inquiry. I will respond within 24 hours."
```

---

## 13. Future Enhancements

### V2 Features
- [ ] Email templates with variable substitution
- [ ] Scheduled sending (draft → send at specific time)
- [ ] Read receipts and tracking
- [ ] Email signatures from configuration
- [ ] Multi-language support for email bodies
- [ ] HTML email templates (with inline CSS)

### V3 Features
- [ ] Email thread management (archive, label, delete)
- [ ] Search across sent emails
- [ ] Analytics (sent email tracking, open rates if tracking enabled)
- [ ] Integration with CRM systems
- [ ] Bulk email operations (with Gmail API batch)

---

## Conclusion

Email Manager extends the proven architecture of email-fetcher with bidirectional email capabilities while maintaining security, reliability, and audit trail requirements. The design prioritizes data integrity, error handling, and integration with existing tools (invoice-generator, drive-manager) for complete business workflow automation.

**Key Design Principles Applied**:
1. **SOLID**: Single responsibility (separate modules for send/draft/reply)
2. **Security by Default**: OAuth2, input validation, secure token storage
3. **Reliability**: Retry logic, comprehensive error handling, audit logs
4. **Integration**: Compatible with existing tools and workflows
5. **YAGNI**: Core features only, no speculative enterprise bloat
