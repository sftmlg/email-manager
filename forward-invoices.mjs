#!/usr/bin/env node

/**
 * Invoice Email Forwarding Script
 *
 * Searches Gmail for invoice-related emails since 2026-01-01 and forwards them
 * to inbox@invoices.software-moling.com for automated processing.
 *
 * Usage:
 *   node forward-invoices.mjs [--dry-run] [--since YYYY-MM-DD] [--max N]
 *
 * Options:
 *   --dry-run        List matching emails without forwarding (default)
 *   --execute        Actually forward emails (requires explicit flag)
 *   --since DATE     Start date (default: 2026-01-01)
 *   --max N          Max emails to process (default: 100)
 *   --account NAME   Account to use: business or personal (default: business)
 *
 * Examples:
 *   node forward-invoices.mjs                                    # Dry run, list matches
 *   node forward-invoices.mjs --execute                          # Forward all invoice emails
 *   node forward-invoices.mjs --execute --since 2026-02-01       # Forward from Feb 1
 *   node forward-invoices.mjs --execute --max 50                 # Forward max 50 emails
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const sinceDate = args.includes('--since')
  ? args[args.indexOf('--since') + 1]
  : '2026-01-01';
const maxResults = args.includes('--max')
  ? parseInt(args[args.indexOf('--max') + 1], 10)
  : 100;
const account = args.includes('--account')
  ? args[args.indexOf('--account') + 1]
  : 'business';

const FORWARD_TO = 'inbox@invoices.software-moling.com';

// Invoice-related keywords for Gmail search
const INVOICE_KEYWORDS = [
  'rechnung',
  'invoice',
  'billing',
  'abrechnung',
  'gutschrift',
  'faktura',
  'zahlungsaufforderung',
  'payment',
  'bestellung',
];

// Common sender patterns for invoices (helps narrow down results)
const INVOICE_SENDER_PATTERNS = [
  'rechnung',
  'invoice',
  'billing',
  'noreply',
  'no-reply',
  'payment',
  'accounting',
];

/**
 * Load OAuth token from file
 */
function loadToken(accountName) {
  const tokenPath = path.join(__dirname, '../tokens/email-manager', `${accountName}.json`);

  if (!fs.existsSync(tokenPath)) {
    console.error(`❌ Token not found: ${tokenPath}`);
    console.error(`Run: cd email-manager && pnpm start auth ${accountName}`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
}

/**
 * Create OAuth2 client
 */
function createOAuth2Client() {
  const credentialsPath = path.join(__dirname, '../tokens/credentials.json');

  if (!fs.existsSync(credentialsPath)) {
    console.error(`❌ Credentials not found: ${credentialsPath}`);
    console.error('Download OAuth credentials from Google Cloud Console');
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const { client_id, client_secret } = credentials.installed || credentials.web;

  return new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://127.0.0.1:5066'
  );
}

/**
 * Build Gmail search query for invoice emails
 */
function buildSearchQuery(since) {
  // Convert date to Gmail format (YYYY/MM/DD)
  const dateStr = since.replace(/-/g, '/');

  // Build query: date filter + (has attachment + keywords)
  const keywordQuery = INVOICE_KEYWORDS.join(' OR ');

  return `after:${dateStr} has:attachment (${keywordQuery})`;
}

/**
 * Format date for display
 */
function formatDate(timestamp) {
  return new Date(parseInt(timestamp, 10)).toISOString().split('T')[0];
}

/**
 * Extract email info for display
 */
function extractEmailInfo(message) {
  const headers = message.payload?.headers || [];
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  return {
    id: message.id,
    threadId: message.threadId,
    subject: getHeader('subject'),
    from: getHeader('from'),
    date: formatDate(message.internalDate),
    snippet: message.snippet,
  };
}

/**
 * Check if email has PDF attachments
 */
function hasPdfAttachment(message) {
  const parts = message.payload?.parts || [];

  function checkParts(partsList) {
    for (const part of partsList) {
      if (part.filename && part.filename.toLowerCase().endsWith('.pdf')) {
        return true;
      }
      if (part.parts) {
        if (checkParts(part.parts)) return true;
      }
    }
    return false;
  }

  return checkParts(parts);
}

/**
 * Forward email to target address
 */
async function forwardEmail(gmail, messageId, emailInfo) {
  try {
    // Get the original message in raw format
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'raw',
    });

    if (!response.data.raw) {
      throw new Error('No raw message data');
    }

    // Decode the raw message
    const rawMessage = Buffer.from(response.data.raw, 'base64').toString('utf8');

    // Create forwarding wrapper
    const forwardMessage = [
      `To: ${FORWARD_TO}`,
      `Subject: Fwd: ${emailInfo.subject}`,
      'Content-Type: message/rfc822',
      '',
      rawMessage,
    ].join('\n');

    // Encode and send
    const encodedMessage = Buffer.from(forwardMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return true;
  } catch (error) {
    console.error(`   ❌ Forward failed: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('📧 Invoice Email Forwarding Script\n');
  console.log(`Account: ${account}`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '▶️  EXECUTE (will forward emails)'}`);
  console.log(`Since: ${sinceDate}`);
  console.log(`Max: ${maxResults} emails`);
  console.log(`Target: ${FORWARD_TO}\n`);

  // Load credentials and create client
  const oauth2Client = createOAuth2Client();
  const tokens = loadToken(account);
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Build search query
  const query = buildSearchQuery(sinceDate);
  console.log(`📋 Search query: ${query}\n`);

  // Search for matching emails
  console.log('🔍 Searching for invoice emails...\n');

  const searchResponse = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: maxResults,
  });

  const messages = searchResponse.data.messages || [];

  if (messages.length === 0) {
    console.log('✅ No matching emails found.');
    return;
  }

  console.log(`📨 Found ${messages.length} matching emails\n`);

  // Process each email
  let processed = 0;
  let forwarded = 0;
  let skipped = 0;

  const forwardedLog = [];

  for (const msg of messages) {
    processed++;

    // Get full message details
    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });

    const emailInfo = extractEmailInfo(fullMessage.data);

    console.log(`[${processed}/${messages.length}] ${emailInfo.date} | ${emailInfo.from}`);
    console.log(`   Subject: ${emailInfo.subject}`);

    // Check if has PDF attachment
    if (!hasPdfAttachment(fullMessage.data)) {
      console.log('   ⏭️  Skipped: No PDF attachment\n');
      skipped++;
      continue;
    }

    if (isDryRun) {
      console.log('   ✅ Would forward (dry run)\n');
      forwardedLog.push({
        date: emailInfo.date,
        from: emailInfo.from,
        subject: emailInfo.subject,
        id: emailInfo.id,
      });
    } else {
      const success = await forwardEmail(gmail, msg.id, emailInfo);
      if (success) {
        console.log('   ✅ Forwarded\n');
        forwarded++;
        forwardedLog.push({
          date: emailInfo.date,
          from: emailInfo.from,
          subject: emailInfo.subject,
          id: emailInfo.id,
        });
      } else {
        skipped++;
      }
    }
  }

  // Summary
  console.log('━'.repeat(60));
  console.log('\n📊 Summary\n');
  console.log(`Total matched: ${messages.length}`);
  console.log(`Processed: ${processed}`);

  if (isDryRun) {
    console.log(`Would forward: ${forwardedLog.length}`);
    console.log(`Would skip: ${skipped}`);
  } else {
    console.log(`Forwarded: ${forwarded}`);
    console.log(`Skipped: ${skipped}`);
  }

  // Save log
  if (forwardedLog.length > 0) {
    const logPath = path.join(__dirname, `forwarded-invoices-${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(forwardedLog, null, 2));
    console.log(`\n📝 Log saved: ${logPath}`);
  }

  if (isDryRun) {
    console.log('\n💡 To actually forward emails, run with --execute flag');
  }
}

// Run
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
