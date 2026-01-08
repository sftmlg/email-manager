# Email Manager Skill

Gmail management CLI for sending, drafting, and fetching emails with attachment support.

## Quick Reference

### Authenticate Account
```bash
cd email-manager
pnpm auth personal    # Personal Gmail account
pnpm auth business    # Business Gmail account
```

### Send Email with Attachment
```bash
pnpm send business --to "client@example.com" --subject "Rechnung #2026-01-003" --body "Hallo Michael, anbei die Rechnung..." --attach "../invoice-generator/output/260108_2026-01-003.pdf"
```

### Create Draft with Attachment
```bash
pnpm draft business --to "michael@sager.co.at" --subject "Rechnung #2026-01-003 - SIT Automatisierung" --body "..." --attach "/path/to/invoice.pdf"
```

### Fetch Emails
```bash
pnpm fetch business --from "2026-01-01" --to "2026-01-08" --max 50
```

### List Drafts
```bash
pnpm drafts business
```

### Check Sync Status
```bash
pnpm status business
```

## OAuth Setup

### Initial Authentication
1. Run `pnpm auth [personal|business]`
2. Browser opens with Google OAuth consent screen
3. Grant Gmail access permissions
4. Token saved locally in `credentials/`

### Token Management
- Tokens stored in `credentials/token-[account].json`
- Refresh tokens handle automatic renewal
- Re-authenticate if token expires: `pnpm auth [account]`

## Critical Email Rules

**NEVER include in client emails:**
- ❌ Invoice amounts, VAT, totals (already in PDF attachment)
- ❌ Due dates or payment terms (already in PDF attachment)
- ❌ Google Drive links (Drive is internal documentation only)

**ALWAYS use:**
- ✅ Correct German characters: ü ö ä ß (NOT ue oe ae ss)
- ✅ "Beste Grüße" (NOT "Beste Gruesse")
- ✅ Keep emails brief - all details are in the attachment

## Draft Management Rules

**"Update draft" = Delete old + Create new**
- When updating a draft, delete the old one first, then create a new one
- Never leave multiple drafts for the same email
- Only one draft per recipient/subject should exist

```bash
# Update draft workflow:
pnpm delete-draft business <old-draft-id>
pnpm draft business --to "..." --subject "..." --body "..." --attach "..."
```

## Email Templates

### Austrian Client Invoice (SIT Tirol)
```
Betreff: Rechnung #2026-01-003 - SIT Automatisierung

Hallo Michi,

anbei findest du die Rechnung für die SIT Automatisierung.

Bei Fragen melde dich gerne.

Beste Grüße,
David
```

### German Client Invoice with Reverse Charge
```
Betreff: Invoice #2026-01-004 - Phase 1 Development

Hi [Name],

please find attached the invoice for Phase 1 development work.

Let me know if you have any questions.

Best regards,
David
```

### Fixed Amount Invoice (Pauschal)
```
Betreff: Rechnung #2026-01-005 - 50% Anzahlung Projektname

Hallo [Name],

anbei die Rechnung für die 50% Anzahlung des Projekts.

Bei Fragen melde dich gerne.

Beste Grüße,
David
```

## Integration with Invoice Generator

### Complete Invoice Workflow
```bash
# 1. Generate invoice
cd invoice-generator
node index.mjs generate --client "sit-tirol" --description "Softwareentwicklung" --quantity 20 --price 70 --days 7

# 2. Upload to Google Drive (internal backup only)
cd ../drive-manager
node index.mjs upload business "./invoice-generator/output/260108_2026-01-003.pdf" "FOLDER_ID"

# 3. Draft email with attachment (NO invoice details, NO Drive links)
cd ../email-manager
pnpm draft business \
  --to "michael@sager.co.at" \
  --subject "Rechnung #2026-01-003 - SIT Automatisierung" \
  --body "Hallo Michi,

anbei findest du die Rechnung für die SIT Automatisierung.

Bei Fragen melde dich gerne.

Beste Grüße,
David" \
  --attach "../invoice-generator/output/260108_2026-01-003.pdf"

# 4. Review draft in Gmail web interface, then send
```

## Integration with Drive Manager

### Find Invoice on Drive
```bash
cd drive-manager
node index.mjs search business "2026-01-003"
# Returns file ID and shareable link
```

### Update Existing Invoice
```bash
node index.mjs update business "./invoice-generator/output/260108_2026-01-003.pdf" "EXISTING_FILE_ID"
```

## Command Reference

### auth
```bash
pnpm auth [personal|business]
```
Authenticate Gmail account via OAuth 2.0.

### send
```bash
pnpm send [account] --to "email@example.com" --subject "Subject" --body "Body text" [--attach "path/to/file.pdf"]
```
Send email immediately with optional attachment.

### draft
```bash
pnpm draft [account] --to "email@example.com" --subject "Subject" --body "Body text" [--attach "path/to/file.pdf"]
```
Create email draft with optional attachment.

### fetch
```bash
pnpm fetch [account] [--from "YYYY-MM-DD"] [--to "YYYY-MM-DD"] [--max 50]
```
Fetch emails within date range.

### drafts
```bash
pnpm drafts [account]
```
List all draft emails.

### status
```bash
pnpm status [account]
```
Show account sync status and authentication state.

## Account Configuration

### Personal Account
- Primary: `david@software-moling.com` (or personal Gmail)
- Use: Personal communications, networking

### Business Account
- Primary: `business@software-moling.com` (or business Gmail)
- Use: Client invoices, official communications, project correspondence

## Attachment Guidelines

### Supported Formats
- PDF (invoices, contracts, proposals)
- DOCX (documents)
- XLSX (spreadsheets)
- PNG/JPG (images, screenshots)

### Size Limits
- Gmail attachment limit: 25 MB
- For larger files: Use Google Drive links instead

## Email Best Practices

### Subject Lines
- Invoices: `Rechnung #YYYY-MM-NNN - [Description]`
- Updates: `Update: [Project Name] - [Brief Topic]`
- Questions: `Frage: [Specific Topic]`

### Body Structure
1. Greeting (Hallo [Name],)
2. Purpose/Context (1-2 sentences)
3. Key Details (bullet points or numbered list)
4. Action Items (if any)
5. Closing (Bei Fragen melde dich gerne.)
6. Signature (Beste Grüße, David)

### Professional Tone
- German clients: "Hallo [Name]," / "Beste Grüße"
- English clients: "Hi [Name]," / "Best regards"
- Formal German: "Sehr geehrte/r [Name]," / "Mit freundlichen Grüßen"

## Troubleshooting

### Authentication Errors
```bash
# Re-authenticate
pnpm auth business

# Check token file exists
ls credentials/token-business.json
```

### Attachment Issues
```bash
# Verify file exists and path is correct
ls -lh ../invoice-generator/output/260108_2026-01-003.pdf

# Use absolute paths if relative paths fail
pnpm draft business --to "..." --subject "..." --body "..." --attach "/absolute/path/to/file.pdf"
```

### Draft Not Appearing
- Check Gmail web interface in "Drafts" folder
- Verify account authentication: `pnpm status business`
- Re-authenticate if needed: `pnpm auth business`

## Common Workflows

### Invoice to Austrian Client
```bash
# Generate → Upload (internal) → Draft with attachment only
cd invoice-generator && node index.mjs generate --client "sit-tirol" --description "..." --quantity 20 --price 70 --days 7
cd ../drive-manager && node index.mjs upload business "..." "FOLDER_ID"  # Internal backup
cd ../email-manager && pnpm draft business --to "..." --subject "Rechnung #..." \
  --body "Hallo ..., anbei die Rechnung. Bei Fragen melde dich gerne. Beste Grüße, David" \
  --attach "../invoice-generator/output/..."
```

### Invoice to German Client (Reverse Charge)
```bash
# Generate with reverse charge → Upload (internal) → Draft in English
cd invoice-generator && node index.mjs generate --client "asd" --description "..." --quantity 40 --price 70 --reverse-charge
cd ../drive-manager && node index.mjs upload business "..." "FOLDER_ID"  # Internal backup
cd ../email-manager && pnpm draft business --to "..." --subject "Invoice #..." \
  --body "Hi ..., please find attached the invoice. Let me know if you have any questions. Best regards, David" \
  --attach "../invoice-generator/output/..."
```

### Quick Email without Attachment
```bash
pnpm send business --to "client@example.com" --subject "Quick Update" --body "Hi, just wanted to let you know the deployment is complete. Best, David"
```

## Email Tracking

| Field | Method |
|-------|--------|
| Sent emails | Gmail "Sent" folder |
| Drafts | Gmail "Drafts" folder + `pnpm drafts` |
| Attachments | Original files in invoice-generator/output/ |
| Drive links | drive-manager search |

## Security Notes

- OAuth tokens stored locally in `credentials/`
- Never commit `credentials/` to git (in .gitignore)
- Re-authenticate periodically for security
- Use business account for client communications
