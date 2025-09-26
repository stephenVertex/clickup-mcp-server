/**
 * Tests for MCP Server
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ClickUpMCPServer } from './mcp-server.js';

describe('ClickUpMCPServer', () => {
  let app: any;

  beforeAll(() => {
    // Set test environment variables
    process.env.CLICKUP_CLIENT_ID = 'test-client-id';
    process.env.CLICKUP_CLIENT_SECRET = 'test-client-secret';

    const server = new ClickUpMCPServer();
    app = (server as any).app;
  });

  describe('OAuth2 Metadata', () => {
    it('should return OAuth2 metadata', async () => {
      const response = await request(app)
        .get('/.well-known/mcp_oauth_metadata')
        .expect(200);

      expect(response.body).toHaveProperty('authorization_endpoint');
      expect(response.body).toHaveProperty('token_endpoint');
      expect(response.body).toHaveProperty('client_id');
      expect(response.body).toHaveProperty('response_types_supported');
      expect(response.body).toHaveProperty('grant_types_supported');
    });
  });

  describe('Client Registration', () => {
    it('should register client with valid redirect URIs', async () => {
      const response = await request(app)
        .post('/oauth/register')
        .send({
          redirect_uris: ['http://localhost:3000/callback']
        })
        .expect(200);

      expect(response.body).toHaveProperty('client_id');
      expect(response.body).toHaveProperty('redirect_uris');
      expect(response.body.redirect_uris).toContain('http://localhost:3000/callback');
    });

    it('should reject registration without redirect URIs', async () => {
      const response = await request(app)
        .post('/oauth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'invalid_request');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('server', 'clickup-mcp-oauth');
    });
  });

  describe('MCP Endpoint', () => {
    it('should reject requests without authorization', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'unauthorized');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'unauthorized');
    });
  });

  describe('Authorization Endpoint', () => {
    it('should reject invalid client_id', async () => {
      const response = await request(app)
        .get('/oauth/authorize')
        .query({
          client_id: 'invalid-client',
          redirect_uri: 'http://localhost:3000/callback',
          response_type: 'code'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'invalid_client');
    });

    it('should reject missing redirect_uri', async () => {
      const response = await request(app)
        .get('/oauth/authorize')
        .query({
          client_id: 'test-client-id',
          response_type: 'code'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'invalid_request');
    });
  });
});