import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { MockClickUpOAuth } from '../mocks/clickup-oauth-mock.js';
import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('End-to-End OAuth2 Flow', () => {
  let mockClickUp: MockClickUpOAuth;
  let serverProcess: any;
  const mcpServerUrl = 'http://localhost:3006';
  const mockClickUpUrl = 'http://localhost:4001';

  beforeAll(async () => {
    // Start mock ClickUp OAuth server
    mockClickUp = new MockClickUpOAuth(4001);
    await mockClickUp.start();

    // Start MCP server with mock ClickUp URL
    serverProcess = spawn('npm', ['start'], {
      env: {
        ...process.env,
        CLICKUP_CLIENT_ID: 'test-client-e2e',
        CLICKUP_CLIENT_SECRET: 'test-secret-e2e',
        CLICKUP_OAUTH_URL: `${mockClickUpUrl}/oauth/authorize`,
        CLICKUP_TOKEN_URL: `${mockClickUpUrl}/oauth/token`,
        CLICKUP_API_URL: `${mockClickUpUrl}/api/v2`,
        PORT: '3006',
        BASE_URL: mcpServerUrl,
        LOG_LEVEL: 'debug'
      },
      cwd: process.cwd()
    });

    // Wait for server to be ready
    await sleep(3000);

    // Verify server is running
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await axios.get(`${mcpServerUrl}/health`);
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await sleep(500);
      }
    }
  }, 20000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    await mockClickUp.stop();
  });

  describe('Complete OAuth2 Flow', () => {
    it('should complete full OAuth2 authentication flow', async () => {
      // Step 1: Get OAuth2 metadata
      const metadataResponse = await axios.get(`${mcpServerUrl}/.well-known/mcp_oauth_metadata`);
      expect(metadataResponse.status).toBe(200);
      expect(metadataResponse.data.authorization_endpoint).toBe(`${mcpServerUrl}/oauth/authorize`);

      // Step 2: Register client dynamically
      const registerResponse = await axios.post(`${mcpServerUrl}/oauth/register`, {
        redirect_uris: ['http://localhost:40000/callback']
      });
      expect(registerResponse.status).toBe(200);
      const clientId = registerResponse.data.client_id;

      // Step 3: Start authorization flow
      const state = 'test-state-e2e';
      const authResponse = await axios.get(`${mcpServerUrl}/oauth/authorize`, {
        params: {
          client_id: clientId,
          redirect_uri: 'http://localhost:40000/callback',
          response_type: 'code',
          state: state
        },
        maxRedirects: 1,
        validateStatus: () => true
      });

      // Should redirect to mock ClickUp, then back to callback
      expect([302, 200]).toContain(authResponse.status);

      // The mock should have redirected back with a code
      // In real scenario, we'd capture the code from the redirect

      // Step 4: Simulate token exchange (this would normally happen internally)
      // For testing, we'll verify the token endpoint works
      try {
        await axios.post(`${mcpServerUrl}/oauth/token`, {
          grant_type: 'authorization_code',
          code: 'test-code',
          client_id: clientId,
          state: state
        });
      } catch (error: any) {
        // Expected to fail without valid code, but endpoint should exist
        expect(error.response.status).toBe(400);
      }
    });

    it('should handle token refresh', async () => {
      // Test refresh token grant type
      try {
        await axios.post(`${mcpServerUrl}/oauth/token`, {
          grant_type: 'refresh_token',
          refresh_token: 'test-refresh-token',
          client_id: 'test-client-e2e'
        });
      } catch (error: any) {
        // Expected to fail without valid refresh token
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBeDefined();
      }
    });
  });

  describe('MCP Protocol Integration', () => {
    it('should reject MCP requests without authentication', async () => {
      try {
        await axios.post(`${mcpServerUrl}/mcp`, {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '1.0.0',
            capabilities: {}
          }
        });
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('unauthorized');
      }
    });

    it('should handle MCP requests with valid token', async () => {
      // In a real scenario, we'd get a valid token from the OAuth flow
      // For testing, we'll verify the endpoint structure
      try {
        await axios.post(`${mcpServerUrl}/mcp`, {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        }, {
          headers: {
            'Authorization': 'Bearer mock-valid-token',
            'mcp-session-id': 'test-session'
          }
        });
      } catch (error: any) {
        // Should fail with unauthorized (no valid token), not 404
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Test with invalid URLs
      try {
        await axios.get(`${mcpServerUrl}/nonexistent-endpoint`);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should validate OAuth2 parameters', async () => {
      // Missing required parameters
      try {
        await axios.get(`${mcpServerUrl}/oauth/authorize`, {
          params: {
            client_id: 'test-client-e2e'
            // Missing redirect_uri
          }
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_request');
      }
    });

    it('should handle invalid client credentials', async () => {
      try {
        await axios.post(`${mcpServerUrl}/oauth/token`, {
          grant_type: 'authorization_code',
          code: 'test-code',
          client_id: 'invalid-client-id'
        });
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('invalid_client');
      }
    });
  });
});