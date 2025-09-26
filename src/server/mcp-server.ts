/**
 * MCP Server implementation with OAuth2
 */

import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import {
  StreamableHTTPServerTransport
} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import crypto from 'crypto';
import { config } from '../config.js';
import { OAuth2Service } from '../services/oauth2.js';
import { logger } from '../logger.js';
import { MCPSession, OAuth2TokenResponse } from '../types.js';
import { MCPHandler } from './mcp-handler.js';
import { ExtendedMCPHandler } from './extended-mcp-handler.js';

export class ClickUpMCPServer {
  private app: express.Application;
  private mcpServer: MCPServer;
  private oauth2Service: OAuth2Service;
  private sessions = new Map<string, MCPSession>();
  private transports = new Map<string, StreamableHTTPServerTransport>();

  constructor() {
    this.app = express();
    this.oauth2Service = new OAuth2Service(config.oauth);

    // Initialize MCP server
    this.mcpServer = new MCPServer({
      name: 'clickup-mcp-server',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.registerTools();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS headers for MCP
    this.app.use((req, res, next) => {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Accept, Last-Event-ID',
        'Access-Control-Expose-Headers': 'Mcp-Session-Id, MCP-Protocol-Version, Content-Type'
      });
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug({
        method: req.method,
        path: req.path,
        headers: req.headers
      }, 'Incoming request');
      next();
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // OAuth2 metadata endpoint (required by MCP spec)
    this.app.get('/.well-known/mcp_oauth_metadata', (req, res) => {
      res.json({
        authorization_endpoint: `${config.baseUrl}/oauth/authorize`,
        token_endpoint: `${config.baseUrl}/oauth/token`,
        client_id: config.oauth.clientId,
        scopes_supported: config.oauth.scope?.split(' ') || [],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        resource: `${config.baseUrl}/`
      });
    });

    // Protected Resource Metadata endpoint (RFC 9728)
    this.app.get('/.well-known/oauth-protected-resource', (req, res) => {
      res.json({
        resource: `${config.baseUrl}/`,
        authorization_servers: [`${config.baseUrl}`],
        scopes_supported: ['clickup'],
        bearer_methods_supported: ['header'],
        resource_documentation: `${config.baseUrl}/health`
      });
    });

    // Dynamic client registration (required by MCP spec)
    const registerHandler = (req: express.Request, res: express.Response) => {
      const { redirect_uris } = req.body;

      logger.info({ redirect_uris }, 'Registration request received');

      if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'redirect_uris is required'
        });
      }

      // Return registration info
      res.json({
        client_id: config.oauth.clientId,
        redirect_uris,
        token_endpoint_auth_method: 'client_secret_post',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scopes: config.oauth.scope?.split(' ') || []
      });
    };

    // Register on both paths for compatibility
    this.app.post('/oauth/register', registerHandler);
    this.app.post('/register', registerHandler);

    // OAuth2 authorization endpoint
    const authorizeHandler = (req: express.Request, res: express.Response) => {
      const { client_id, redirect_uri, state, code_challenge, code_challenge_method } = req.query;

      logger.info({
        client_id,
        redirect_uri,
        state,
        code_challenge: code_challenge ? 'present' : 'missing'
      }, 'Authorization request received');

      if (client_id !== config.oauth.clientId) {
        return res.status(400).json({
          error: 'invalid_client',
          error_description: 'Unknown client_id'
        });
      }

      if (!redirect_uri) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'redirect_uri is required'
        });
      }

      // Create authorization URL with ClickUp
      const { url, state: authState } = this.oauth2Service.createAuthorizationUrl(
        `${config.baseUrl}${config.oauth.callbackPath}`,
        state as string
      );

      // Store the original redirect_uri for later
      const session = this.sessions.get(authState) || {
        id: authState,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      // Store client's redirect URI
      this.sessions.set(authState, {
        ...session,
        workspaceId: redirect_uri as string // temporarily store redirect_uri
      });

      // Redirect to ClickUp authorization
      res.redirect(url);
    };

    // Register on both paths for compatibility
    this.app.get('/oauth/authorize', authorizeHandler);
    this.app.get('/authorize', authorizeHandler);

    // OAuth2 callback from ClickUp
    this.app.get(config.oauth.callbackPath, async (req, res) => {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).send('Missing code or state parameter');
      }

      try {
        // Get session and original redirect URI
        const session = this.sessions.get(state as string);
        const originalRedirectUri = session?.workspaceId; // we stored it here temporarily

        if (!originalRedirectUri) {
          logger.error({ state }, 'Session not found for state');
          throw new Error('Session not found');
        }

        logger.info({
          state,
          code: code ? 'present' : 'missing',
          originalRedirectUri
        }, 'OAuth callback received, redirecting to client');

        // Store the code temporarily for the token exchange
        this.sessions.set(state as string, {
          ...session,
          lastUsed: Date.now(),
          // Store code temporarily
          userId: code as string
        });

        // Redirect back to client with code
        const clientRedirect = new URL(originalRedirectUri);
        clientRedirect.searchParams.set('code', code as string);
        clientRedirect.searchParams.set('state', state as string);

        res.redirect(clientRedirect.toString());
      } catch (error) {
        logger.error({ error }, 'OAuth callback error');
        res.status(500).send('Authentication failed');
      }
    });

    // OAuth2 token endpoint
    const tokenHandler = async (req: express.Request, res: express.Response) => {
      const { grant_type, code, refresh_token, client_id, redirect_uri } = req.body;

      if (client_id !== config.oauth.clientId) {
        return res.status(401).json({
          error: 'invalid_client'
        });
      }

      try {
        let tokenData: OAuth2TokenResponse;

        if (grant_type === 'authorization_code') {
          // Exchange code for token with ClickUp
          logger.info({
            code: code ? 'present' : 'missing',
            redirect_uri,
            state: req.body.state
          }, 'Token exchange request');

          if (!code) {
            throw new Error('Code not provided');
          }

          // Find the state - try multiple approaches
          let foundState: string | undefined = req.body.state;

          // If no state in body, try to find by code or redirect_uri
          if (!foundState) {
            for (const [state, session] of this.sessions.entries()) {
              // Check if session has the code or redirect_uri
              if (session.userId === code || session.workspaceId === redirect_uri) {
                foundState = state;
                break;
              }
            }
          }

          logger.info({ foundState: foundState || 'not found' }, 'State lookup result');

          // Exchange code for token
          tokenData = await this.oauth2Service.exchangeCodeForToken(
            code as string,
            foundState || 'unknown'
          );

          // Store token in session if we found the state
          if (foundState) {
            const session = this.sessions.get(foundState);
            if (session) {
              this.sessions.set(foundState, {
                ...session,
                token: tokenData
              });
            }
          }
        } else if (grant_type === 'refresh_token') {
          tokenData = await this.oauth2Service.refreshToken(refresh_token);
        } else {
          return res.status(400).json({
            error: 'unsupported_grant_type'
          });
        }

        res.json(tokenData);
      } catch (error) {
        logger.error({ error }, 'Token endpoint error');
        res.status(400).json({
          error: 'invalid_grant',
          error_description: error instanceof Error ? error.message : 'Token request failed'
        });
      }
    };

    // Register on both paths for compatibility
    this.app.post('/oauth/token', tokenHandler);
    this.app.post('/token', tokenHandler);

    // MCP endpoint handler - shared between /mcp and / paths
    const mcpHandler = async (req: express.Request, res: express.Response) => {
      // Handle OPTIONS requests for CORS
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      // Handle GET requests for SSE
      if (req.method === 'GET') {
        const accept = req.headers['accept'] as string;

        if (accept && accept.includes('text/event-stream')) {
          // Set up SSE
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
          });

          // Send initial message
          res.write('data: {"jsonrpc": "2.0", "method": "notifications/ready"}\n\n');

          // Keep connection alive
          const keepAlive = setInterval(() => {
            res.write(': keepalive\n\n');
          }, 30000);

          req.on('close', () => {
            clearInterval(keepAlive);
          });

          return;
        } else {
          return res.status(400).json({
            error: 'bad_request',
            error_description: 'GET requests must include Accept: text/event-stream'
          });
        }
      }

      // Handle POST requests for JSON-RPC
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: 'method_not_allowed',
          error_description: 'Only POST and GET methods supported'
        });
      }

      const sessionId = req.headers['mcp-session-id'] as string;
      const authHeader = req.headers['authorization'] as string;
      const protocolVersion = req.headers['mcp-protocol-version'] as string;

      logger.info({
        method: req.method,
        sessionId,
        hasAuth: !!authHeader,
        protocolVersion,
        body: req.body
      }, 'MCP request received');

      // Validate protocol version
      if (protocolVersion && protocolVersion !== '2025-06-18') {
        return res.status(400).json({
          error: 'unsupported_protocol_version',
          error_description: `Protocol version ${protocolVersion} not supported`
        });
      }

      // Validate authorization
      if (!authHeader?.startsWith('Bearer ')) {
        res.set('WWW-Authenticate', `Bearer resource="${config.baseUrl}/", scope="clickup"`);
        return res.status(401).json({
          error: 'unauthorized',
          error_description: 'Missing or invalid authorization header'
        });
      }

      const token = authHeader.substring(7);

      // For now, accept any token that looks valid (starts with valid prefix)
      // In production, we would validate against ClickUp API
      // Claude Code sends the access_token from OAuth2 flow
      if (!token || token.length < 10) {
        res.set('WWW-Authenticate', `Bearer resource="${config.baseUrl}/", scope="clickup"`);
        return res.status(401).json({
          error: 'unauthorized',
          error_description: 'Invalid token'
        });
      }

      // Handle JSON-RPC request directly
      const body = req.body;

      if (!body || body.jsonrpc !== '2.0') {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Not a valid JSON-RPC 2.0 request'
        });
      }

      try {
        // Generate session ID for new sessions
        let currentSessionId = sessionId;
        if (!currentSessionId && body.method === 'initialize') {
          currentSessionId = crypto.randomUUID();
        }

        // Find ClickUp access token from session
        let clickUpToken = null;

        // Try to find a session with a valid ClickUp token
        for (const [sessionState, session] of this.sessions.entries()) {
          if (session.token && session.token.access_token) {
            clickUpToken = session.token.access_token;
            logger.info({ sessionState }, 'Using ClickUp token from session');
            break;
          }
        }

        if (!clickUpToken) {
          logger.warn('No ClickUp token found in sessions, using Claude Code token');
          clickUpToken = token; // Fallback to Claude Code token
        }

        // Create handler for this request with the ClickUp token
        const handler = new ExtendedMCPHandler(clickUpToken);
        const response = await handler.handleRequest(body);

        // Set headers for MCP compliance
        const responseHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (currentSessionId) {
          responseHeaders['Mcp-Session-Id'] = currentSessionId;
        }

        if (protocolVersion) {
          responseHeaders['MCP-Protocol-Version'] = protocolVersion;
        }

        logger.info({
          method: body.method,
          hasError: !!response.error,
          sessionId: currentSessionId
        }, 'MCP response sent');

        res.set(responseHeaders).json(response);
      } catch (error) {
        logger.error({ error }, 'MCP handling error');
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error'
          },
          id: body.id || null
        });
      }
    };

    // MCP endpoint - support both POST and GET on /mcp and /
    this.app.all('/mcp', mcpHandler);
    this.app.all('/', mcpHandler);

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        server: 'clickup-mcp-oauth',
        version: '1.0.0'
      });
    });
  }

  /**
   * Register MCP tools
   */
  private registerTools(): void {
    // Using the SDK's tool registration method
    (this.mcpServer as any).tools = [
      {
        name: 'clickup_get_user',
        description: 'Get current ClickUp user information',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        },
        handler: async (args: any) => {
          // TODO: Implement actual ClickUp API call
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  user: 'Test User',
                  workspace: 'Test Workspace'
                }, null, 2)
              }
            ]
          };
        }
      }
    ];
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(config.port, config.host, () => {
        logger.info({
          port: config.port,
          host: config.host,
          baseUrl: config.baseUrl
        }, 'ClickUp MCP OAuth Server started');

        console.log(`\n🚀 ClickUp MCP OAuth Server`);
        console.log(`📡 Server: ${config.baseUrl}`);
        console.log(`🔐 OAuth2: Enabled`);
        console.log(`📋 Health: ${config.baseUrl}/health`);
        console.log(`\n✅ Ready for connections!`);

        resolve();
      });
    });
  }
}

export default ClickUpMCPServer;