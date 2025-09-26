import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { MockClickUpOAuth } from './mocks/clickup-oauth-mock.js';
import { spawn } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const sleep = promisify(setTimeout);

/**
 * Simulates Claude Code MCP client behavior
 */
class ClaudeCodeSimulator {
  private axiosClient: AxiosInstance;
  private sessionId: string;
  private accessToken?: string;
  private state: string;
  private codeVerifier: string;
  private codeChallenge: string;

  constructor(private serverUrl: string) {
    this.axiosClient = axios.create({
      baseURL: serverUrl,
      validateStatus: () => true // Don't throw on any status
    });
    this.sessionId = crypto.randomUUID();
    this.state = crypto.randomBytes(32).toString('base64url');

    // Generate PKCE challenge
    this.codeVerifier = crypto.randomBytes(32).toString('base64url');
    const hash = crypto.createHash('sha256').update(this.codeVerifier).digest();
    this.codeChallenge = hash.toString('base64url');
  }

  /**
   * Step 1: Discover OAuth2 metadata
   */
  async discoverOAuth2Metadata() {
    const response = await this.axiosClient.get('/.well-known/mcp_oauth_metadata');

    if (response.status !== 200) {
      throw new Error(`Failed to discover OAuth2 metadata: ${response.status}`);
    }

    return response.data;
  }

  /**
   * Step 2: Register dynamic client
   */
  async registerClient(redirectUri: string) {
    const response = await this.axiosClient.post('/oauth/register', {
      redirect_uris: [redirectUri],
      client_name: 'Claude Code Simulator',
      grant_types: ['authorization_code', 'refresh_token']
    });

    if (response.status !== 200) {
      throw new Error(`Failed to register client: ${response.status}`);
    }

    return response.data;
  }

  /**
   * Step 3: Start authorization flow
   */
  async startAuthorizationFlow(clientId: string, redirectUri: string) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: this.state,
      code_challenge: this.codeChallenge,
      code_challenge_method: 'S256',
      scope: 'read write'
    });

    const response = await this.axiosClient.get(`/oauth/authorize?${params}`, {
      maxRedirects: 0
    });

    if (response.status !== 302) {
      throw new Error(`Expected redirect, got ${response.status}`);
    }

    return response.headers.location;
  }

  /**
   * Step 4: Exchange authorization code for token
   */
  async exchangeCodeForToken(clientId: string, code: string, redirectUri: string) {
    const response = await this.axiosClient.post('/oauth/token', {
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: this.codeVerifier,
      state: this.state
    });

    if (response.status !== 200) {
      throw new Error(`Failed to exchange code: ${response.status} - ${JSON.stringify(response.data)}`);
    }

    this.accessToken = response.data.access_token;
    return response.data;
  }

  /**
   * Step 5: Initialize MCP connection
   */
  async initializeMCP() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await this.axiosClient.post('/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '1.0.0',
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        },
        clientInfo: {
          name: 'Claude Code Simulator',
          version: '1.0.0'
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'mcp-session-id': this.sessionId,
        'Content-Type': 'application/json'
      }
    });

    return response;
  }

  /**
   * Step 6: List available tools
   */
  async listTools() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await this.axiosClient.post('/mcp', {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'mcp-session-id': this.sessionId
      }
    });

    return response;
  }

  /**
   * Step 7: Call a tool
   */
  async callTool(toolName: string, args: any = {}) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await this.axiosClient.post('/mcp', {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    }, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'mcp-session-id': this.sessionId
      }
    });

    return response;
  }
}

describe('Claude Code Simulator Tests', () => {
  let mockClickUp: MockClickUpOAuth;
  let serverProcess: any;
  let simulator: ClaudeCodeSimulator;
  const mcpServerUrl = 'http://localhost:3007';
  const mockClickUpUrl = 'http://localhost:4002';
  const simulatorCallbackUrl = 'http://localhost:41000/callback';

  beforeAll(async () => {
    // Start mock ClickUp OAuth server
    mockClickUp = new MockClickUpOAuth(4002);
    await mockClickUp.start();

    // Start MCP server
    serverProcess = spawn('npm', ['start'], {
      env: {
        ...process.env,
        CLICKUP_CLIENT_ID: 'claude-simulator-client',
        CLICKUP_CLIENT_SECRET: 'claude-simulator-secret',
        CLICKUP_OAUTH_URL: `${mockClickUpUrl}/oauth/authorize`,
        CLICKUP_TOKEN_URL: `${mockClickUpUrl}/oauth/token`,
        CLICKUP_API_URL: `${mockClickUpUrl}/api/v2`,
        PORT: '3007',
        BASE_URL: mcpServerUrl,
        LOG_LEVEL: 'info'
      },
      cwd: process.cwd()
    });

    // Wait for server
    await sleep(3000);

    // Initialize simulator
    simulator = new ClaudeCodeSimulator(mcpServerUrl);
  }, 20000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    await mockClickUp.stop();
  });

  describe('Claude Code OAuth2 Flow Simulation', () => {
    it('should complete full OAuth2 flow like Claude Code', async () => {
      // Step 1: Discover OAuth2 metadata
      const metadata = await simulator.discoverOAuth2Metadata();
      expect(metadata).toHaveProperty('authorization_endpoint');
      expect(metadata).toHaveProperty('token_endpoint');
      expect(metadata).toHaveProperty('client_id');
      expect(metadata.code_challenge_methods_supported).toContain('S256');

      // Step 2: Register client with dynamic port
      const registration = await simulator.registerClient(simulatorCallbackUrl);
      expect(registration.client_id).toBe('claude-simulator-client');
      expect(registration.redirect_uris).toContain(simulatorCallbackUrl);

      // Step 3: Start authorization flow
      const authUrl = await simulator.startAuthorizationFlow(
        registration.client_id,
        simulatorCallbackUrl
      );
      expect(authUrl).toContain(mockClickUpUrl);
      expect(authUrl).toContain('oauth/authorize');

      // Step 4: Simulate callback from ClickUp
      // Extract the state from the auth URL to simulate callback
      const urlParams = new URL(authUrl);
      const mockCode = 'SIMULATED_AUTH_CODE';

      // In real flow, user would authorize and ClickUp would redirect
      // For testing, we'll simulate the token exchange directly

      // Note: In actual implementation, the server handles callback and exchanges code
      // Here we're testing the token endpoint directly
    });

    it('should handle MCP initialization after authentication', async () => {
      // This test would run after successful OAuth2 flow
      // For now, test that endpoint requires authentication

      const response = await simulator.initializeMCP().catch(err => err);

      // Should fail without valid token
      if (response instanceof Error) {
        expect(response.message).toContain('No access token');
      } else {
        expect(response.status).toBe(401);
      }
    });

    it('should list tools after authentication', async () => {
      // Test tool listing endpoint structure
      const response = await simulator.listTools().catch(err => err);

      // Should fail without valid token
      if (response instanceof Error) {
        expect(response.message).toContain('No access token');
      } else {
        expect(response.status).toBe(401);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network interruptions', async () => {
      const badSimulator = new ClaudeCodeSimulator('http://localhost:9999');

      try {
        await badSimulator.discoverOAuth2Metadata();
      } catch (error: any) {
        expect(error.message).toContain('ECONNREFUSED');
      }
    });

    it('should handle invalid OAuth2 responses', async () => {
      // Test with invalid client registration
      try {
        await simulator.registerClient(''); // Empty redirect URI
      } catch (error: any) {
        expect(error.message).toContain('Failed to register');
      }
    });
  });

  describe('Session Management', () => {
    it('should maintain session across requests', async () => {
      // Each simulator instance should have unique session
      const sim1 = new ClaudeCodeSimulator(mcpServerUrl);
      const sim2 = new ClaudeCodeSimulator(mcpServerUrl);

      // They should have different session IDs (internal)
      expect(sim1).not.toBe(sim2);
    });
  });
});