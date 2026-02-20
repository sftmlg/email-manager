# Invoice Email Forwarding Script

Automated script to forward invoice-related emails from Gmail to the invoice processing inbox.

## Purpose

This script searches Gmail for emails that match invoice patterns (keywords + PDF attachments) and forwards them to `inbox@invoices.software-moling.com` for automated processing by the getmyinvoices-manager workflow.

## Quick Start

```bash
# 1. Dry run (list matches without forwarding)
node forward-invoices.mjs

# 2. Review the list, then execute
node forward-invoices.mjs --execute

# 3. Check the log file
cat forwarded-invoices-*.json
```

## Usage

```bash
node forward-invoices.mjs [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | List matching emails without forwarding | ✅ (default) |
| `--execute` | Actually forward emails (requires explicit flag) | ❌ |
| `--since DATE` | Start date in YYYY-MM-DD format | `2026-01-01` |
| `--max N` | Maximum emails to process | `100` |
| `--account NAME` | Gmail account: `business` or `personal` | `business` |

### Examples

```bash
# Dry run - see what would be forwarded
node forward-invoices.mjs

# Forward all invoice emails since Jan 1, 2026
node forward-invoices.mjs --execute

# Forward only from February 2026
node forward-invoices.mjs --execute --since 2026-02-01

# Forward max 50 emails
node forward-invoices.mjs --execute --max 50

# Use personal account instead of business
node forward-invoices.mjs --execute --account personal
```

## How It Works

### 1. Search Criteria

The script builds a Gmail search query that looks for:

**Date Filter**: `after:YYYY/MM/DD`
- Default: 2026-01-01
- Configurable with `--since`

**Attachment Filter**: `has:attachment`
- Only processes emails with attachments

**Keyword Filter** (any match):
```
rechnung OR invoice OR billing OR abrechnung OR gutschrift OR
faktura OR zahlungsaufforderung OR payment OR bestellung
```

**PDF Validation**:
- Further filters to only forward emails with PDF attachments
- Skips emails that only have other attachment types

### 2. Forwarding Process

For each matching email:
1. Fetch the original message in raw RFC 2822 format
2. Wrap it in a forwarding envelope:
   ```
   To: inbox@invoices.software-moling.com
   Subject: Fwd: [Original Subject]
   Content-Type: message/rfc822

   [Original Email]
   ```
3. Send via Gmail API
4. Log the result

### 3. Output

**Console**: Shows each email being processed with status
```
[1/15] 2026-02-10 | billing@example.com
   Subject: Rechnung #12345
   ✅ Forwarded
```

**Log File**: JSON file with all forwarded emails
```json
[
  {
    "date": "2026-02-10",
    "from": "billing@example.com",
    "subject": "Rechnung #12345",
    "id": "18d4f2a1b3c5d6e7"
  }
]
```

## Safety Features

### Dry Run by Default
The script runs in **dry-run mode by default**. You must explicitly use `--execute` to forward emails. This prevents accidental bulk operations.

### PDF Attachment Check
Only forwards emails with PDF attachments, reducing false positives from generic marketing emails that contain invoice keywords.

### Progress Logging
Shows real-time progress and saves a JSON log of all forwarded emails for audit purposes.

### Error Handling
If a forward fails, the script logs the error and continues processing remaining emails.

## Prerequisites

### 1. Gmail API Authentication

The script uses the email-manager's OAuth tokens:

```bash
# Authenticate if not already done
cd /path/to/email-manager
pnpm start auth business
```

This creates: `../tokens/email-manager/business.json`

### 2. Token Location

The script expects tokens at:
```
claude-code-cli-tools/
├── tokens/
│   ├── credentials.json              # OAuth client credentials
│   └── email-manager/
│       ├── business.json             # Business account token
│       └── personal.json             # Personal account token
└── email-manager/
    └── forward-invoices.mjs          # This script
```

### 3. Gmail API Scopes

Required scopes (already configured in email-manager):
- `gmail.readonly` - Read emails
- `gmail.send` - Forward emails

## Integration with GetMyInvoices Manager

This script is part of the invoice processing pipeline:

```
Gmail Inbox
    ↓ (forward-invoices.mjs)
inbox@invoices.software-moling.com
    ↓ (getmyinvoices-manager)
GetMyInvoices Platform
    ↓ (getmyinvoices-manager sync)
finance/invoices/YYYY/MM/
```

### Workflow

1. **Backfill**: Run this script to forward historical invoice emails
2. **Continuous**: Set up Gmail filter to auto-forward future invoices (optional)
3. **Processing**: getmyinvoices-manager pulls from `inbox@invoices.software-moling.com`
4. **Sync**: getmyinvoices-manager syncs downloaded invoices to local finance repo

## Common Issues

### Token Not Found
```
❌ Token not found: ../tokens/email-manager/business.json
Run: cd email-manager && pnpm start auth business
```

**Solution**: Authenticate the account first using email-manager

### Credentials Not Found
```
❌ Credentials not found: ../tokens/credentials.json
Download OAuth credentials from Google Cloud Console
```

**Solution**: Copy `credentials.json` from Google Cloud Console to `tokens/` directory

### No Matching Emails
```
✅ No matching emails found.
```

**Possible causes**:
- Date range too narrow (adjust with `--since`)
- No invoice emails in the account
- Keywords don't match email content
- Emails have no PDF attachments

### Forward Fails
```
❌ Forward failed: Insufficient Permission
```

**Solution**: Check that Gmail API has `gmail.send` scope enabled. Re-authenticate if needed.

## Advanced Usage

### Custom Date Range

```bash
# Forward only January 2026 invoices
node forward-invoices.mjs --execute --since 2026-01-01 --max 1000

# Then manually filter in finance repo by date
```

### Multiple Runs

The script is **idempotent-safe** - forwarding the same email multiple times creates duplicate forwards, but GetMyInvoices deduplicates by invoice number/date.

However, to avoid clutter:
- Use specific date ranges (`--since`)
- Keep logs of forwarded email IDs
- Don't run overlapping date ranges repeatedly

### Monitoring

```bash
# Check how many emails would be forwarded
node forward-invoices.mjs --since 2026-01-01 | grep "Would forward"

# Forward in batches
node forward-invoices.mjs --execute --max 50 --since 2026-01-01
node forward-invoices.mjs --execute --max 50 --since 2026-02-01
```

## Development

### Testing Changes

Always test with `--dry-run` first:

```bash
# Test with recent date to limit results
node forward-invoices.mjs --since 2026-02-15 --max 5
```

### Modifying Keywords

Edit the `INVOICE_KEYWORDS` array in the script:

```javascript
const INVOICE_KEYWORDS = [
  'rechnung',
  'invoice',
  'billing',
  // Add more keywords here
];
```

### Debugging

Add `console.log` statements before the forwarding logic:

```javascript
console.log('Raw message preview:', rawMessage.substring(0, 200));
```

## Maintenance

### Regular Backfills

Run monthly to catch missed invoices:

```bash
# First day of new month - backfill previous month
node forward-invoices.mjs --execute --since 2026-02-01 --max 200
```

### Audit Logs

Keep forwarding logs for audit purposes:

```bash
# Archive logs
mkdir -p logs/
mv forwarded-invoices-*.json logs/
```

## Security Notes

- Script uses existing email-manager OAuth tokens
- Forwards preserve original email headers and attachments
- No email content is modified or stored locally
- All Gmail API calls use official Google APIs
- Tokens are stored locally only, never committed to git

## Future Enhancements

Potential improvements (not yet implemented):

- [ ] Deduplication check (skip already forwarded emails)
- [ ] Sender whitelist/blacklist
- [ ] OCR-based invoice detection (beyond keywords)
- [ ] Integration with getmyinvoices-manager status
- [ ] Automatic scheduling (cron job)
- [ ] Multi-account batch processing
- [ ] Email thread preservation
- [ ] Custom forwarding rules (per sender)

## Support

For issues or questions:
1. Check email-manager README for OAuth troubleshooting
2. Verify Gmail API scopes in Google Cloud Console
3. Test with `--dry-run` first
4. Check forwarding logs for error details
