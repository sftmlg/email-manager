# Email Manager

Gmail management CLI tool for fetching, sending, and managing email drafts with OAuth authentication.

## Quick Start

**Invocation Pattern**: `pnpm start <command> [args]`

### Common Commands
```bash
pnpm start auth personal                                       # Authenticate
pnpm start fetch business --query "from:client.com" --max 50  # Fetch emails
pnpm start send personal --to "john@example.com" --subject "Test" --body "Hello"
pnpm start draft business --to "x@y.com" --subject "Proposal" --body "Draft text"
pnpm start drafts business                                     # List drafts
pnpm start status                                              # Show sync state
```

**Need help?** `pnpm start help`

---

## Keywords

`email`, `gmail`, `draft`, `send`, `fetch`, `inbox`, `mail`, `unsubscribe`, `cleanup`, `newsletter`

These keywords trigger automatic routing to this tool when mentioned in user requests.

## Features

- OAuth2 authentication with Google Gmail API
- Fetch emails with attachments (incremental sync)
- Send emails with file attachments
- Create and manage email drafts
- Multi-account support (personal/business)
- RFC 2822 compliant email formatting
- Base64 attachment encoding
- Sync state tracking

## Installation

```bash
pnpm install
```

## Setup

1. Download OAuth credentials from Google Cloud Console
2. Place `client_secret_*.json` in the repository root (or `credentials.json`)
3. Authenticate accounts:

```bash
pnpm auth personal
pnpm auth business
```

## Commands Reference

### Authentication

```bash
pnpm start auth [personal|business|all]
```

Opens browser for OAuth flow. Tokens saved to `token-personal.json` and `token-business.json`.

### Fetch Emails

```bash
pnpm start fetch [account] [start-date] [end-date] [options]
```

**Options:**
- `--query <text>` - Gmail search query (e.g., "from:example.com", "subject:invoice")
- `--max <number>` - Maximum results to fetch (default: 100)
- `--force` - Force historical fetch, ignoring last sync date

**Examples:**
```bash
pnpm start fetch personal                              # All personal emails since last sync
pnpm start fetch business 2024-06-01 2024-12-31       # Business emails (date range)
pnpm start fetch all                                   # All accounts
pnpm start fetch business --query "from:client.com" --max 50   # Search with filters
pnpm start fetch business --query "subject:invoice" --force    # Search all history
```

### Send Email

```bash
pnpm start send <account> --to <email> --subject <text> --body <text> [options]
```

**Options:**
- `--to <email>` - Recipient email (required)
- `--subject <text>` - Email subject (required)
- `--body <text>` - Email body (required)
- `--cc <email>` - CC recipients (optional)
- `--bcc <email>` - BCC recipients (optional)
- `--attach <file>` - Attach file, can be used multiple times (optional)

**Examples:**
```bash
pnpm start send personal --to "john@example.com" --subject "Hello" --body "Test message"

pnpm start send business --to "client@example.com" --subject "Report" --body "See attached" --attach report.pdf

pnpm start send personal --to "team@example.com" --subject "Update" --body "Meeting notes" --cc "manager@example.com" --attach notes.pdf --attach agenda.docx
```

### Create Draft

```bash
pnpm start draft <account> --to <email> --subject <text> --body <text> [options]
```

Same options as `send` command. Creates a draft instead of sending immediately.

**Example:**
```bash
pnpm start draft business --to "prospect@example.com" --subject "Proposal" --body "Draft proposal text" --attach proposal.pdf
```

### List Drafts

```bash
pnpm start drafts [personal|business|all]
```

Shows all drafts with ID, subject, recipient, and date.

### Delete Draft

```bash
pnpm start delete-draft <account> <draft-id>
```

Deletes a draft by ID.

### Status

```bash
pnpm start status
```

Shows sync status for all accounts (messages fetched, attachments saved, emails sent, drafts created).

## Inbox Cleanup Skill

Agent-driven Gmail inbox cleanup using the Gmail API directly (not browser automation). Triggered by keywords: `cleanup`, `unsubscribe`, `newsletter`, `inbox cleanup`.

### Safety Rules (CRITICAL — Read First)

1. **NEVER archive or trash the entire inbox.** Only process emails matching explicit sender/pattern filters.
2. **Only process UNREAD emails** unless user explicitly asks for broader scope.
3. **Conservative filtering**: When uncertain, KEEP the email.
4. **No bulk inbox operations**: Never use `removeLabelIds: ['INBOX']` on ALL emails without specific sender scoping.
5. **Confirm before scale**: If >50 emails affected, report count + sender list before executing.
6. **Use `messages.trash()` per-message.** Do NOT use `batchModify` with `addLabelIds: ['TRASH']` — it's unreliable.
7. **Use `messages.modify()` for archiving.** `removeLabelIds: ['INBOX', 'UNREAD']` works reliably for archive operations.

### Step-by-Step Workflow

**Phase 1: Connect & Survey**
1. Load token from `tokens/email-manager/{personal|business}.json`
2. Create OAuth2 client and set credentials (auto-refresh if expired)
3. List UNREAD INBOX emails: `gmail.users.messages.list({ labelIds: ['INBOX', 'UNREAD'], maxResults: 500 })`
4. For each email, get metadata: `gmail.users.messages.get({ format: 'metadata', metadataHeaders: ['From', 'Subject', 'List-Unsubscribe', 'List-Unsubscribe-Post'] })`
5. Present categorized summary to user: marketing/newsletter vs. relevant

**Phase 2: Classify**
Categorize by sender domain into:
- **Archive**: Marketing newsletters, promotions, expired offers, notification spam
- **Keep**: Bills, receipts, personal contacts, security alerts, service notifications
- **Uncertain**: Default to KEEP

**Phase 3: Unsubscribe (optional)**
For senders user wants to stop receiving:

| Method | When | How |
|--------|------|-----|
| One-Click POST (RFC 8058) | `List-Unsubscribe-Post` header exists | POST `List-Unsubscribe=One-Click` to the URL |
| GET unsubscribe | HTTP URL in `List-Unsubscribe` header | GET request to the URL |
| No automated option | Only `mailto:` or no header | Skip, inform user |

**Phase 4: Execute**
- **Archive** (remove from inbox, keep in All Mail): `gmail.users.messages.modify({ removeLabelIds: ['INBOX', 'UNREAD'] })`
- **Trash** (move to trash, auto-deleted after 30 days): `gmail.users.messages.trash({ id: messageId })`
- **Batch archive** (for >10 emails from same pattern): `gmail.users.messages.batchModify({ ids: [...], removeLabelIds: ['INBOX', 'UNREAD'] })`

**Phase 5: Verify**
Re-list UNREAD INBOX and show remaining count + summary to confirm only relevant emails remain.

### Implementation Notes

- Write a temporary `.mjs` script in the email-manager directory (has `googleapis` in node_modules)
- Use ESM imports (`import { google } from 'googleapis'`)
- Run with `node script.mjs` from the email-manager directory
- Delete the script after execution

### Account Mapping

| Account | Email | Token |
|---------|-------|-------|
| `personal` | `davmol12@gmail.com` | `tokens/email-manager/personal.json` |
| `business` | `mail@software-moling.com` | `tokens/email-manager/business.json` |

## Best Practices

### Attachments
When drafting or sending emails with attachments, keep the body concise. Do NOT duplicate information that's already in the attachment — let the attachment speak for itself.

### Updating Drafts
When updating an existing draft, always delete the old draft first using `delete-draft`, then create a new one. Never leave orphan drafts in the inbox.


## Email Threading (CRITICAL)

### When Replying to an Email

**ALWAYS use `--thread-id` when replying to an existing email.** The Gmail API does NOT auto-thread based on "Re: " in the subject line.

**Correct Workflow:**
```bash
# 1. Fetch the original email to get the thread ID
pnpm start fetch business --query "from:sender@example.com" --max 1

# 2. Check the fetched email metadata for threadId
# Located in: email-index/business/YYYY/MM/YYMMDD_subject_threadid/_email.meta.json

# 3. Draft with --thread-id
pnpm start draft business \
  --to "sender@example.com" \
  --subject "Re: Original Subject" \
  --body "Reply text" \
  --thread-id "19c568d01576d949"
```

**Why This Matters:**
- Without `--thread-id`, Gmail creates a NEW conversation thread
- "Re: " in subject does NOT trigger auto-threading in Gmail API
- Recipients see replies as separate emails instead of a conversation
- Email clients lose context and conversation history

### RFC 2822 Threading Headers

For maximum compatibility across email clients, also use `--in-reply-to` and `--references`:

```bash
pnpm start draft business \
  --to "sender@example.com" \
  --subject "Re: Original Subject" \
  --body "Reply text" \
  --thread-id "19c568d01576d949" \
  --in-reply-to "<original-message-id@gmail.com>" \
  --references "<msg1@gmail.com> <msg2@gmail.com> <original-message-id@gmail.com>"
```

**Where to find these headers:**
- `Message-ID`: In `_email.meta.json` → `messageId`
- `References`: In `_email.meta.json` → `referencesHeader`

### Quick Reference

| Scenario | Required Parameters |
|----------|-------------------|
| New conversation | `--to`, `--subject`, `--body` |
| Reply to email | Add `--thread-id` |
| Reply with full RFC compliance | Add `--thread-id`, `--in-reply-to`, `--references` |
| Forward | New thread (no threading params) |

## OAuth Scopes

The tool requests the following Gmail API scopes:
- `gmail.readonly` - Read emails and attachments
- `gmail.send` - Send emails
- `gmail.compose` - Create drafts
- `gmail.modify` - Manage drafts and labels

## File Structure

```
email-manager/
├── src/
│   ├── index.ts        # CLI entry point
│   ├── auth.ts         # OAuth authentication
│   ├── gmail.ts        # Gmail API client
│   ├── sync-state.ts   # State management
│   └── types.ts        # TypeScript types
├── dist/               # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Output Structure

Fetched emails are saved to:
```
email-index/
├── personal/
│   └── 2024/
│       └── 12/
│           └── 241208_subject-slug_abc12345/
│               ├── _email.txt
│               ├── _email.meta.json
│               └── attachment.pdf
└── business/
    └── ...
```

## Technical Details

- ES modules (Node.js 18+)
- TypeScript with strict mode
- RFC 2822 MIME message format
- Base64url encoding for Gmail API
- Multipart/mixed for attachments
- OAuth redirect: `http://127.0.0.1:5066`
- Sync state stored in `_metadata/email-sync-state.json`

## Supported Attachment Types

- PDF: `application/pdf`
- Word: `.doc`, `.docx`
- Excel: `.xls`, `.xlsx`
- Images: `.png`, `.jpg`, `.gif`
- Text: `.txt`, `.html`, `.json`
- Archives: `.zip`

## Error Handling

- Automatic token refresh on expiry
- Re-authentication flow if refresh fails
- File existence validation for attachments
- MIME type detection from file extension
- Graceful handling of missing attachments
