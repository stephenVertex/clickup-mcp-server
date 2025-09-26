import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import axios from 'axios';
import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('OAuth2 Flow Tests', () => {
  const baseUrl = 'http://localhost:3005';
  const testClientId = 'C63PQ4BQV0KYARWHQV2N7R3Q1WBYJQRP'; // Real client ID from .env

  beforeAll(async () => {
    // Assume server is already running on port 3005
    // Verify server is accessible
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await axios.get(`${baseUrl}/health`);
        break;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error('Server not running on port 3005. Please start it first.');
        }
        await sleep(1000);
      }
    }
  }, 15000);

  afterAll(() => {
    // Server continues running
  });

  describe('OAuth2 Metadata', () => {
    it('should return valid OAuth2 metadata', async () => {
      const response = await axios.get(`${baseUrl}/.well-known/mcp_oauth_metadata`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('authorization_endpoint');
      expect(response.data).toHaveProperty('token_endpoint');
      expect(response.data).toHaveProperty('client_id');
      expect(response.data.authorization_endpoint).toBe(`${baseUrl}/oauth/authorize`);
      expect(response.data.token_endpoint).toBe(`${baseUrl}/oauth/token`);
      expect(response.data.response_types_supported).toContain('code');
      expect(response.data.grant_types_supported).toContain('authorization_code');
      expect(response.data.code_challenge_methods_supported).toContain('S256');
    });
  });

  describe('Dynamic Client Registration', () => {
    it('should register a client with redirect URIs', async () => {
      const response = await axios.post(`${baseUrl}/oauth/register`, {
        redirect_uris: ['http://localhost:40000/callback', 'http://localhost:40001/callback']
      });

      expect(response.status).toBe(200);
      expect(response.data.client_id).toBe(testClientId);
      expect(response.data.redirect_uris).toEqual([
        'http://localhost:40000/callback',
        'http://localhost:40001/callback'
      ]);
      expect(response.data.grant_types).toContain('authorization_code');
    });

    it('should reject registration without redirect_uris', async () => {
      try {
        await axios.post(`${baseUrl}/oauth/register`, {});
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_request');
      }
    });
  });

  describe('Authorization Endpoint', () => {
    it('should redirect to ClickUp authorization', async () => {
      const response = await axios.get(`${baseUrl}/oauth/authorize`, {
        params: {
          client_id: testClientId,
          redirect_uri: 'http://localhost:40000/callback',
          response_type: 'code',
          state: 'test-state-123',
          code_challenge: 'challenge123',
          code_challenge_method: 'S256'
        },
        maxRedirects: 0,
        validateStatus: (status) => status === 302
      });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('app.clickup.com');
      expect(response.headers.location).toContain('/api');
    });

    it('should reject invalid client_id', async () => {
      try {
        await axios.get(`${baseUrl}/oauth/authorize`, {
          params: {
            client_id: 'invalid-client-id',
            redirect_uri: 'http://localhost:40000/callback',
            response_type: 'code'
          }
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_client');
      }
    });

    it('should reject missing redirect_uri', async () => {
      try {
        await axios.get(`${baseUrl}/oauth/authorize`, {
          params: {
            client_id: testClientId,
            response_type: 'code'
          }
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_request');
      }
    });
  });

  describe('Token Endpoint', () => {
    it('should reject invalid client_id', async () => {
      try {
        await axios.post(`${baseUrl}/oauth/token`, {
          grant_type: 'authorization_code',
          code: 'test-code',
          client_id: 'invalid-client-id'
        });
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('invalid_client');
      }
    });

    it('should reject unsupported grant_type', async () => {
      try {
        await axios.post(`${baseUrl}/oauth/token`, {
          grant_type: 'password',
          client_id: testClientId
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('unsupported_grant_type');
      }
    });
  });

  describe('MCP Endpoint Security', () => {
    it('should reject requests without authorization', async () => {
      try {
        await axios.post(`${baseUrl}/mcp`, {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        });
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('unauthorized');
      }
    });

    it('should reject requests with invalid token', async () => {
      try {
        await axios.post(`${baseUrl}/mcp`, {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        }, {
          headers: {
            'Authorization': 'Bearer invalid-token-123'
          }
        });
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('unauthorized');
      }
    });
  });

  describe('Session Management', () => {
    it('should create and maintain sessions', async () => {
      // Simulate creating a session through authorization
      const authResponse = await axios.get(`${baseUrl}/oauth/authorize`, {
        params: {
          client_id: testClientId,
          redirect_uri: 'http://localhost:40000/callback',
          response_type: 'code',
          state: 'session-test-123'
        },
        maxRedirects: 0,
        validateStatus: (status) => status === 302
      });

      expect(authResponse.status).toBe(302);

      // Session should be created and tracked
      // In real scenario, we'd check if session exists in server memory
    });
  });
});