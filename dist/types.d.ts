/**
 * Type definitions for the ClickUp MCP OAuth2 Server
 */
export interface OAuth2Config {
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    callbackPath: string;
    scope?: string;
}
export interface OAuth2TokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
}
export interface OAuth2State {
    state: string;
    codeChallenge?: string;
    redirectUri: string;
    createdAt: number;
    mcpSessionId?: string;
}
export interface MCPSession {
    id: string;
    token?: OAuth2TokenResponse;
    workspaceId?: string;
    userId?: string;
    createdAt: number;
    lastUsed: number;
}
export interface ServerConfig {
    port: number;
    host: string;
    baseUrl: string;
    oauth: OAuth2Config;
    logLevel: string;
}
//# sourceMappingURL=types.d.ts.map