import express from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface MockToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  created_at: number;
}

export class MockClickUpOAuth {
  private app: express.Application;
  private server: any;
  private tokens = new Map<string, MockToken>();
  private authCodes = new Map<string, { clientId: string; redirectUri: string }>();

  constructor(private port: number = 4000) {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Mock ClickUp OAuth authorization endpoint
    this.app.get('/oauth/authorize', (req, res) => {
      const { client_id, redirect_uri, state } = req.query;

      if (!client_id || !redirect_uri) {
        return res.status(400).json({ error: 'Missing parameters' });
      }

      // Generate mock authorization code
      const code = `MOCK_CODE_${uuidv4()}`;
      this.authCodes.set(code, {
        clientId: client_id as string,
        redirectUri: redirect_uri as string
      });

      // Redirect back to callback with code
      const callbackUrl = new URL(redirect_uri as string);
      callbackUrl.searchParams.set('code', code);
      if (state) {
        callbackUrl.searchParams.set('state', state as string);
      }

      res.redirect(callbackUrl.toString());
    });

    // Mock ClickUp OAuth token endpoint
    this.app.post('/oauth/token', (req, res) => {
      const { grant_type, code, refresh_token, client_id, client_secret } = req.body;

      if (grant_type === 'authorization_code') {
        if (!code || !this.authCodes.has(code)) {
          return res.status(400).json({ error: 'invalid_grant' });
        }

        const authInfo = this.authCodes.get(code);
        if (authInfo?.clientId !== client_id) {
          return res.status(401).json({ error: 'invalid_client' });
        }

        // Generate mock tokens
        const token: MockToken = {
          access_token: `mock_access_${uuidv4()}`,
          refresh_token: `mock_refresh_${uuidv4()}`,
          expires_in: 3600,
          created_at: Date.now()
        };

        this.tokens.set(token.access_token, token);
        this.authCodes.delete(code);

        res.json(token);
      } else if (grant_type === 'refresh_token') {
        if (!refresh_token) {
          return res.status(400).json({ error: 'invalid_request' });
        }

        // Find token by refresh token
        let existingToken: MockToken | undefined;
        for (const token of this.tokens.values()) {
          if (token.refresh_token === refresh_token) {
            existingToken = token;
            break;
          }
        }

        if (!existingToken) {
          return res.status(400).json({ error: 'invalid_grant' });
        }

        // Generate new access token
        const newToken: MockToken = {
          access_token: `mock_access_${uuidv4()}`,
          refresh_token: existingToken.refresh_token,
          expires_in: 3600,
          created_at: Date.now()
        };

        this.tokens.set(newToken.access_token, newToken);

        res.json(newToken);
      } else {
        res.status(400).json({ error: 'unsupported_grant_type' });
      }
    });

    // Mock ClickUp API endpoints
    this.app.get('/api/v2/user', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      if (!this.tokens.has(token)) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({
        user: {
          id: 12345,
          username: 'testuser',
          email: 'test@example.com',
          color: '#000000',
          profilePicture: null,
          initials: 'TU'
        }
      });
    });

    this.app.get('/api/v2/team', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      res.json({
        teams: [
          {
            id: '1234567',
            name: 'Test Workspace',
            color: '#000000',
            members: [
              {
                user: {
                  id: 12345,
                  username: 'testuser',
                  email: 'test@example.com'
                }
              }
            ]
          }
        ]
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Mock ClickUp OAuth server running on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock ClickUp OAuth server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getTokens(): Map<string, MockToken> {
    return this.tokens;
  }

  getAuthCodes(): Map<string, { clientId: string; redirectUri: string }> {
    return this.authCodes;
  }
}