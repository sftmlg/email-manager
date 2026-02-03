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

`email`, `gmail`, `draft`, `send`, `fetch`, `inbox`, `mail`

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
