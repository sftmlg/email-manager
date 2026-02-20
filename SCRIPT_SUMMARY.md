# Invoice Forwarding Script - Summary

## What Was Built

A standalone Node.js script (`forward-invoices.mjs`) that uses the email-manager CLI tool's Gmail API integration to automatically find and forward invoice-related emails.

## Location

```
claude-code-cli-tools/email-manager/
├── forward-invoices.mjs           # Main script
├── INVOICE_FORWARDING.md          # Full documentation
├── SCRIPT_SUMMARY.md              # This file
└── README.md                      # Updated with invoice forwarding section
```

## Email Manager Commands Available

The email-manager CLI does NOT have a native "forward" command. Available commands are:

- `fetch` - Download emails with attachments
- `send` - Send new emails
- `draft` - Create email drafts
- `update-draft` - Update existing drafts
- `delete-draft` - Delete drafts
- `drafts` - List all drafts
- `status` - Show sync status
- `auth` - OAuth authentication

## Why a Separate Script?

Since email-manager doesn't have forwarding built-in, I created a standalone script that:

1. Uses the same OAuth tokens as email-manager (stored in `../tokens/email-manager/`)
2. Uses the same `googleapis` dependency
3. Implements Gmail message forwarding via the Gmail API
4. Provides invoice-specific filtering and automation

## How It Works

### Search Strategy

**Gmail Query Built**:
```
after:2026/01/01 has:attachment (rechnung OR invoice OR billing OR abrechnung OR gutschrift OR faktura OR zahlungsaufforderung OR payment OR bestellung)
```

This searches for emails that:
- Are after a specific date (default: 2026-01-01)
- Have attachments
- Contain invoice-related keywords (German + English)

**PDF Validation**:
After fetching matches, the script filters to only emails with PDF attachments, reducing false positives.

### Forwarding Process

For each matching email:

1. **Fetch** the original message in raw RFC 2822 format
2. **Wrap** it in a forwarding envelope:
   ```
   To: inbox@invoices.software-moling.com
   Subject: Fwd: [Original Subject]
   Content-Type: message/rfc822

   [Complete Original Email with Attachments]
   ```
3. **Send** via Gmail API `users.messages.send()`
4. **Log** the result to JSON file

### Safety Features

- **Dry-run by default**: Must explicitly use `--execute` to forward
- **PDF-only**: Skips emails without PDF attachments
- **Progress logging**: Real-time console output
- **Audit trail**: JSON log of all forwarded emails
- **Error handling**: Continues processing if individual forwards fail

## Usage Examples

```bash
# Navigate to email-manager directory
cd /path/to/email-manager

# 1. Dry run - see what would be forwarded (SAFE)
node forward-invoices.mjs

# 2. Forward all invoice emails since Jan 1, 2026
node forward-invoices.mjs --execute

# 3. Forward only from Feb 1, 2026
node forward-invoices.mjs --execute --since 2026-02-01

# 4. Limit to 50 emails
node forward-invoices.mjs --execute --max 50

# 5. Use personal account instead of business
node forward-invoices.mjs --execute --account personal
```

## Test Results

**Test Run (Dry Mode)**:
```
Account: business
Mode: DRY RUN (no changes)
Since: 2026-01-01
Max: 100 emails
Target: inbox@invoices.software-moling.com

Search query: after:2026/01/01 has:attachment (rechnung OR invoice OR billing OR abrechnung OR gutschrift OR faktura OR zahlungsaufforderung OR payment OR bestellung)

Found 86 matching emails

Summary:
Total matched: 86
Processed: 86
Would forward: 83
Would skip: 3 (no PDF attachment)
```

**Sample Matched Emails**:
- Supabase invoices
- GetMyInvoices invoices
- Google Workspace invoices
- Resend receipts
- Wispr Flow receipts
- Anthropic receipts
- David Moling's own invoices (sent from mail@software-moling.com)
- eightbit Office Gutschrift

## Output Files

### Console Output
Real-time progress with status for each email:
```
[1/86] 2026-02-16 | mail@example.com
   Subject: Rechnung #12345
   ✅ Would forward (dry run)

[2/86] 2026-02-16 | billing@example.com
   Subject: Invoice #67890
   ⏭️  Skipped: No PDF attachment
```

### JSON Log File
Saved as `forwarded-invoices-{timestamp}.json`:
```json
[
  {
    "date": "2026-02-16",
    "from": "invoice@example.com",
    "subject": "Your receipt from Example #12345",
    "id": "19c65f0bc302b463"
  }
]
```

## Integration with GetMyInvoices

This script is the **first step** in the invoice processing pipeline:

```
Gmail Inbox
    ↓
forward-invoices.mjs (this script)
    ↓
inbox@invoices.software-moling.com
    ↓
GetMyInvoices Platform (auto-imports)
    ↓
getmyinvoices-manager CLI (sync)
    ↓
finance/invoices/YYYY/MM/ (local storage)
```

**Next Steps**:
1. Run this script to backfill historical invoices
2. Use getmyinvoices-manager to sync from GetMyInvoices to local finance repo
3. (Optional) Set up Gmail filter to auto-forward future invoice emails

## Prerequisites

### 1. Email Manager Authentication

The script uses email-manager's OAuth tokens. Must be authenticated first:

```bash
cd email-manager
pnpm start auth business
```

This creates: `../tokens/email-manager/business.json`

### 2. Required Files

```
claude-code-cli-tools/
├── tokens/
│   ├── credentials.json              # Google OAuth client credentials
│   └── email-manager/
│       └── business.json             # OAuth token (auto-created by email-manager)
└── email-manager/
    └── forward-invoices.mjs          # This script
```

### 3. Gmail API Scopes

The script requires these scopes (already configured in email-manager):
- `gmail.readonly` - Read emails and search
- `gmail.send` - Send/forward emails

## Technical Details

### Implementation

- **Language**: Node.js ES modules (`.mjs`)
- **Dependencies**: `googleapis` (already in email-manager)
- **Auth**: OAuth2 via Google APIs
- **API**: Gmail API v1
- **Format**: RFC 2822 message forwarding

### Gmail API Calls

1. `users.messages.list()` - Search for emails matching query
2. `users.messages.get(format: 'full')` - Get email details and check attachments
3. `users.messages.get(format: 'raw')` - Get raw RFC 2822 message
4. `users.messages.send()` - Send forwarded email

### Why Not Use email-manager Commands?

**Considered Options**:
1. ❌ `fetch` + `send` - Would lose attachments and threading
2. ❌ Add forward command to email-manager - Scope creep, one-time use case
3. ✅ Standalone script - Clean, focused, reusable for similar tasks

The script uses the same token infrastructure but implements forwarding logic independently.

## Common Issues & Solutions

### Issue: Token Not Found
```
❌ Token not found: ../tokens/email-manager/business.json
```
**Solution**: Run `pnpm start auth business` in email-manager directory

### Issue: No Matching Emails
```
✅ No matching emails found.
```
**Possible Causes**:
- Date range too narrow (try `--since 2025-01-01`)
- Account has no invoice emails
- All invoice emails lack PDF attachments

**Debug**: Check Gmail manually with search query shown in script output

### Issue: Forward Permission Error
```
❌ Forward failed: Insufficient Permission
```
**Solution**: Re-authenticate with `pnpm start auth business` to refresh scopes

## Maintenance

### Regular Backfills

Run monthly to catch any missed invoices:

```bash
# On the 1st of each month, backfill previous month
node forward-invoices.mjs --execute --since 2026-02-01 --max 200
```

### Audit Logs

Keep logs for record-keeping:

```bash
mkdir -p logs/
mv forwarded-invoices-*.json logs/
```

### Monitoring

```bash
# Check count before executing
node forward-invoices.mjs --since 2026-02-01 | grep "Would forward"

# Forward in smaller batches if needed
node forward-invoices.mjs --execute --max 25 --since 2026-02-01
```

## Future Enhancements

Not yet implemented but could be added:

- Deduplication (check if email already forwarded)
- Sender whitelist/blacklist
- Custom keyword sets per account
- Automatic scheduling (cron)
- Integration with getmyinvoices-manager status
- Multi-account batch processing
- Thread preservation
- OCR-based invoice detection

## Documentation

- **INVOICE_FORWARDING.md** - Full user guide (setup, usage, troubleshooting)
- **SCRIPT_SUMMARY.md** - This file (technical overview)
- **README.md** - Updated email-manager docs with invoice forwarding section

## Testing Checklist

Before first real execution:

- [x] Script syntax valid (runs without errors)
- [x] Dry-run mode works
- [x] Finds expected number of emails (86 found in test)
- [x] PDF validation works (3 skipped for no PDF)
- [x] Log file created with correct format
- [ ] Actual forwarding (requires `--execute` - NOT run in this build)
- [ ] Verify forwarded email arrives at inbox@invoices.software-moling.com
- [ ] Verify GetMyInvoices auto-imports the forwarded emails

## Execution Safety

**IMPORTANT**: The script is built but NOT executed with `--execute` flag.

**Current State**: Dry-run tested only, no actual emails forwarded.

**Next Steps** (when ready to use):
1. Review dry-run output: `node forward-invoices.mjs`
2. Verify the matched emails are correct
3. Run with execute: `node forward-invoices.mjs --execute --max 10` (start small)
4. Verify arrival at inbox@invoices.software-moling.com
5. Check GetMyInvoices platform for imports
6. Scale up: `node forward-invoices.mjs --execute`

## Success Criteria

✅ Script created and functional
✅ Dry-run tested with real Gmail data
✅ Found 86 invoice emails, correctly filtered to 83 with PDFs
✅ Documentation complete
✅ Integration points defined
✅ Safety features implemented (dry-run default, PDF validation, logging)

🔵 Awaiting user execution approval before running `--execute`
