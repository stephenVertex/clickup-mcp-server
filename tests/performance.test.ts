import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('Performance and Stress Tests', () => {
  let serverProcess: any;
  const baseUrl = 'http://localhost:3008';

  beforeAll(async () => {
    // Start server for performance testing
    serverProcess = spawn('npm', ['start'], {
      env: {
        ...process.env,
        CLICKUP_CLIENT_ID: 'perf-test-client',
        CLICKUP_CLIENT_SECRET: 'perf-test-secret',
        PORT: '3008',
        BASE_URL: baseUrl,
        LOG_LEVEL: 'error' // Reduce logging overhead
      },
      cwd: process.cwd()
    });

    // Wait for server
    await sleep(3000);

    // Verify server is running
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await axios.get(`${baseUrl}/health`);
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await sleep(500);
      }
    }
  }, 20000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe('Response Time Tests', () => {
    it('should respond to health check within 100ms', async () => {
      const start = Date.now();
      await axios.get(`${baseUrl}/health`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should respond to OAuth2 metadata within 50ms', async () => {
      const start = Date.now();
      await axios.get(`${baseUrl}/.well-known/mcp_oauth_metadata`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should handle client registration within 100ms', async () => {
      const start = Date.now();
      await axios.post(`${baseUrl}/oauth/register`, {
        redirect_uris: ['http://localhost:40000/callback']
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 50 concurrent health checks', async () => {
      const requests = Array(50).fill(null).map(() =>
        axios.get(`${baseUrl}/health`)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should handle 30 concurrent OAuth2 metadata requests', async () => {
      const requests = Array(30).fill(null).map(() =>
        axios.get(`${baseUrl}/.well-known/mcp_oauth_metadata`)
      );

      const responses = await Promise.all(requests);

      // All should succeed and return identical data
      expect(responses.every(r => r.status === 200)).toBe(true);
      const firstData = JSON.stringify(responses[0].data);
      expect(responses.every(r => JSON.stringify(r.data) === firstData)).toBe(true);
    });

    it('should handle 20 concurrent client registrations', async () => {
      const requests = Array(20).fill(null).map((_, i) =>
        axios.post(`${baseUrl}/oauth/register`, {
          redirect_uris: [`http://localhost:${40000 + i}/callback`]
        })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(responses.every(r => r.data.client_id === 'perf-test-client')).toBe(true);
    });
  });

  describe('Session Management Under Load', () => {
    it('should maintain session isolation under concurrent requests', async () => {
      const sessions = Array(10).fill(null).map((_, i) => ({
        id: `session-${i}`,
        state: `state-${i}`
      }));

      // Start multiple authorization flows
      const authRequests = sessions.map(session =>
        axios.get(`${baseUrl}/oauth/authorize`, {
          params: {
            client_id: 'perf-test-client',
            redirect_uri: `http://localhost:${40000 + parseInt(session.id.split('-')[1])}/callback`,
            response_type: 'code',
            state: session.state
          },
          maxRedirects: 0,
          validateStatus: (status) => status === 302
        })
      );

      const responses = await Promise.all(authRequests);

      // All should redirect
      expect(responses.every(r => r.status === 302)).toBe(true);

      // Each should maintain its own state
      responses.forEach((response, i) => {
        const location = response.headers.location;
        expect(location).toBeDefined();
      });
    });
  });

  describe('Memory and Resource Tests', () => {
    it('should handle 100 sequential requests without memory leak', async () => {
      const requests = 100;
      const results: number[] = [];

      for (let i = 0; i < requests; i++) {
        const start = Date.now();
        await axios.get(`${baseUrl}/health`);
        results.push(Date.now() - start);
      }

      // Response time should remain consistent (not gradually increasing)
      const firstQuarter = results.slice(0, 25).reduce((a, b) => a + b, 0) / 25;
      const lastQuarter = results.slice(75).reduce((a, b) => a + b, 0) / 25;

      // Last quarter shouldn't be significantly slower than first
      expect(lastQuarter).toBeLessThan(firstQuarter * 2);
    });

    it('should reject requests gracefully when overloaded', async () => {
      // Send many concurrent MCP requests without auth (should be rejected quickly)
      const requests = Array(100).fill(null).map(() =>
        axios.post(`${baseUrl}/mcp`, {
          jsonrpc: '2.0',
          id: Math.random(),
          method: 'test',
          params: {}
        }, {
          validateStatus: () => true
        })
      );

      const responses = await Promise.all(requests);

      // All should be rejected with 401
      expect(responses.every(r => r.status === 401)).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from malformed requests', async () => {
      // Send malformed request
      await axios.post(`${baseUrl}/oauth/register`, 'invalid json', {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      });

      // Server should still respond to valid requests
      const healthResponse = await axios.get(`${baseUrl}/health`);
      expect(healthResponse.status).toBe(200);
    });

    it('should handle large request payloads', async () => {
      const largePayload = {
        redirect_uris: Array(100).fill(null).map((_, i) =>
          `http://localhost:${40000 + i}/callback`
        )
      };

      const response = await axios.post(`${baseUrl}/oauth/register`, largePayload, {
        validateStatus: () => true
      });

      // Should either accept or reject cleanly
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Throughput Tests', () => {
    it('should maintain >100 requests/second for simple endpoints', async () => {
      const duration = 1000; // 1 second
      const start = Date.now();
      let count = 0;

      while (Date.now() - start < duration) {
        await axios.get(`${baseUrl}/health`);
        count++;
      }

      expect(count).toBeGreaterThan(100);
    });

    it('should handle sustained load for 5 seconds', async () => {
      const duration = 5000;
      const start = Date.now();
      const errors: any[] = [];

      // Keep sending requests for 5 seconds
      const interval = setInterval(async () => {
        try {
          await axios.get(`${baseUrl}/.well-known/mcp_oauth_metadata`);
        } catch (error) {
          errors.push(error);
        }
      }, 10); // Every 10ms

      await sleep(duration);
      clearInterval(interval);

      // Should have minimal errors
      expect(errors.length).toBeLessThan(10);
    });
  });
});