import * as fs from "fs";
import * as path from "path";
import type { SyncState, AccountSyncState } from "./types.js";

const DEFAULT_STATE: SyncState = {
  accounts: {},
};

export class SyncStateManager {
  private statePath: string;
  private state: SyncState;

  constructor(statePath: string) {
    this.statePath = statePath;
    this.state = this.load();
  }

  private load(): SyncState {
    if (!fs.existsSync(this.statePath)) {
      return { ...DEFAULT_STATE };
    }

    try {
      const data = fs.readFileSync(this.statePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Failed to load sync state, starting fresh:`, error);
      return { ...DEFAULT_STATE };
    }
  }

  save(): void {
    const dir = path.dirname(this.statePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  getAccountState(email: string): AccountSyncState | undefined {
    return this.state.accounts[email];
  }

  updateAccountState(email: string, updates: Partial<AccountSyncState>): void {
    const existing = this.state.accounts[email] || {
      lastSyncDate: new Date().toISOString(),
      totalFetched: 0,
      attachmentsSaved: 0,
      emailsSent: 0,
      draftsCreated: 0,
    };

    this.state.accounts[email] = {
      ...existing,
      ...updates,
      lastSyncDate: new Date().toISOString(),
    };

    this.save();
  }

  incrementStats(
    email: string,
    fetched: number,
    attachments: number
  ): void {
    const existing = this.state.accounts[email];
    if (existing) {
      existing.totalFetched += fetched;
      existing.attachmentsSaved += attachments;
      existing.lastSyncDate = new Date().toISOString();
      this.save();
    }
  }

  incrementSentCount(email: string): void {
    const existing = this.state.accounts[email];
    if (existing) {
      existing.emailsSent += 1;
      existing.lastSyncDate = new Date().toISOString();
      this.save();
    }
  }

  incrementDraftCount(email: string): void {
    const existing = this.state.accounts[email];
    if (existing) {
      existing.draftsCreated += 1;
      existing.lastSyncDate = new Date().toISOString();
      this.save();
    }
  }

  getLastSyncDate(email: string): Date | undefined {
    const account = this.state.accounts[email];
    if (account?.lastSyncDate) {
      return new Date(account.lastSyncDate);
    }
    return undefined;
  }

  getAllAccounts(): string[] {
    return Object.keys(this.state.accounts);
  }

  getStats(): {
    totalAccounts: number;
    totalFetched: number;
    totalAttachments: number;
    totalSent: number;
    totalDrafts: number;
  } {
    const accounts = Object.values(this.state.accounts);
    return {
      totalAccounts: accounts.length,
      totalFetched: accounts.reduce((sum, a) => sum + a.totalFetched, 0),
      totalAttachments: accounts.reduce((sum, a) => sum + a.attachmentsSaved, 0),
      totalSent: accounts.reduce((sum, a) => sum + (a.emailsSent || 0), 0),
      totalDrafts: accounts.reduce((sum, a) => sum + (a.draftsCreated || 0), 0),
    };
  }

  printStatus(): void {
    console.log("\n=== Sync State ===\n");

    if (Object.keys(this.state.accounts).length === 0) {
      console.log("No accounts synced yet.");
      return;
    }

    for (const [email, account] of Object.entries(this.state.accounts)) {
      console.log(`Account: ${email}`);
      console.log(`  Last sync: ${account.lastSyncDate}`);
      console.log(`  Messages fetched: ${account.totalFetched}`);
      console.log(`  Attachments saved: ${account.attachmentsSaved}`);
      console.log(`  Emails sent: ${account.emailsSent || 0}`);
      console.log(`  Drafts created: ${account.draftsCreated || 0}`);
      if (account.lastHistoryId) {
        console.log(`  History ID: ${account.lastHistoryId}`);
      }
      console.log("");
    }
  }
}
