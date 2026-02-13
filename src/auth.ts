import { google, Auth } from "googleapis";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;
import * as fs from "fs";
import * as http from "http";
import * as url from "url";
import open from "open";
import type { AccountConfig } from "./types.js";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
];

// For Desktop app OAuth clients, Google allows loopback redirects automatically
// We use 127.0.0.1 (not localhost) as Google explicitly allows this for desktop apps
const REDIRECT_PORT = 5066;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}`;

interface Credentials {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

export async function getAuthenticatedClient(
  account: AccountConfig
): Promise<OAuth2Client> {
  const credentials = loadCredentials(account.credentialsPath);
  const { client_id, client_secret } = credentials.installed || credentials.web!;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    REDIRECT_URI
  );

  // Check for existing token
  if (fs.existsSync(account.tokenPath)) {
    const token = JSON.parse(fs.readFileSync(account.tokenPath, "utf-8"));
    oauth2Client.setCredentials(token);

    // Check if token is expired
    if (token.expiry_date && token.expiry_date < Date.now()) {
      console.log(`Token expired for ${account.email}, refreshing...`);
      try {
        const { credentials: newCredentials } =
          await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(newCredentials);
        saveToken(account.tokenPath, newCredentials);
      } catch (error) {
        console.log("Failed to refresh token, re-authenticating...");
        return authenticateInteractively(oauth2Client, account);
      }
    }

    return oauth2Client;
  }

  // No token, authenticate interactively
  return authenticateInteractively(oauth2Client, account);
}

function loadCredentials(path: string): Credentials {
  if (!fs.existsSync(path)) {
    throw new Error(
      `Credentials file not found at ${path}. Please download from Google Cloud Console.`
    );
  }
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

function saveToken(path: string, token: any): void {
  fs.writeFileSync(path, JSON.stringify(token, null, 2));
  console.log(`Token saved to ${path}`);
}

async function authenticateInteractively(
  oauth2Client: OAuth2Client,
  account: AccountConfig
): Promise<OAuth2Client> {
  return new Promise((resolve, reject) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });

    console.log(`\nAuthenticating ${account.name} (${account.email})...`);
    console.log(`Opening browser for authorization...\n`);
    console.log(`If the browser doesn't open, visit this URL manually:\n${authUrl}\n`);

    // Create temporary server to receive callback
    const server = http.createServer(async (req, res) => {
      try {
        const queryParams = url.parse(req.url!, true).query;

        if (queryParams.error) {
          res.writeHead(400);
          res.end(`Authentication failed: ${queryParams.error}`);
          server.close();
          reject(new Error(`Authentication failed: ${queryParams.error}`));
          return;
        }

        if (queryParams.code) {
          res.writeHead(200);
          res.end(
            "Authentication successful! You can close this window and return to the terminal."
          );

          const { tokens } = await oauth2Client.getToken(queryParams.code as string);
          oauth2Client.setCredentials(tokens);
          saveToken(account.tokenPath, tokens);

          server.close();
          resolve(oauth2Client);
        }
      } catch (error) {
        res.writeHead(500);
        res.end("Authentication error");
        server.close();
        reject(error);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`Listening on port ${REDIRECT_PORT} for OAuth callback...`);
      open(authUrl);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authentication timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });
}

export async function revokeToken(account: AccountConfig): Promise<void> {
  if (fs.existsSync(account.tokenPath)) {
    fs.unlinkSync(account.tokenPath);
    console.log(`Token revoked for ${account.email}`);
  }
}
