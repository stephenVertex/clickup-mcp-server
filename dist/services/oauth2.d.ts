/**
 * OAuth2 Service for ClickUp authentication
 */
import { OAuth2Config, OAuth2State, OAuth2TokenResponse } from '../types.js';
export declare class OAuth2Service {
    private config;
    private states;
    private readonly STATE_TTL;
    constructor(config: OAuth2Config);
    /**
     * Generate a secure random state parameter
     */
    generateState(): string;
    /**
     * Generate PKCE code challenge
     */
    generatePKCE(): {
        verifier: string;
        challenge: string;
    };
    /**
     * Create authorization URL for OAuth2 flow
     */
    createAuthorizationUrl(redirectUri: string, state?: string): {
        url: string;
        state: string;
    };
    /**
     * Validate state parameter
     */
    validateState(state: string): OAuth2State | null;
    /**
     * Exchange authorization code for access token
     */
    exchangeCodeForToken(code: string, state: string): Promise<OAuth2TokenResponse>;
    /**
     * Refresh access token
     */
    refreshToken(refreshToken: string): Promise<OAuth2TokenResponse>;
    /**
     * Revoke access token
     */
    revokeToken(token: string): Promise<void>;
    /**
     * Clean up expired states
     */
    private cleanupExpiredStates;
}
export default OAuth2Service;
//# sourceMappingURL=oauth2.d.ts.map