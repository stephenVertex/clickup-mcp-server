/**
 * OAuth2 Service for ClickUp authentication
 */

import { randomBytes, createHash } from 'crypto';
import axios from 'axios';
import { OAuth2Config, OAuth2State, OAuth2TokenResponse } from '../types.js';
import { logger } from '../logger.js';

export class OAuth2Service {
  private states = new Map<string, OAuth2State>();
  private readonly STATE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(private config: OAuth2Config) {
    // Cleanup expired states every minute
    setInterval(() => this.cleanupExpiredStates(), 60000);
  }

  /**
   * Generate a secure random state parameter
   */
  generateState(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge
   */
  generatePKCE(): { verifier: string; challenge: string } {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256')
      .update(verifier)
      .digest('base64url');

    return { verifier, challenge };
  }

  /**
   * Create authorization URL for OAuth2 flow
   */
  createAuthorizationUrl(redirectUri: string, state?: string): { url: string; state: string } {
    const authState = state || this.generateState();
    const pkce = this.generatePKCE();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: authState
    });

    if (this.config.scope) {
      params.append('scope', this.config.scope);
    }

    // Store state with PKCE verifier
    this.states.set(authState, {
      state: authState,
      codeChallenge: pkce.verifier,
      redirectUri,
      createdAt: Date.now()
    });

    const url = `${this.config.authorizationUrl}?${params.toString()}`;

    logger.debug({ url, state: authState }, 'Created authorization URL');

    return { url, state: authState };
  }

  /**
   * Validate state parameter
   */
  validateState(state: string): OAuth2State | null {
    const storedState = this.states.get(state);

    if (!storedState) {
      logger.warn({ state }, 'Invalid state parameter');
      return null;
    }

    // Check if state is expired
    if (Date.now() - storedState.createdAt > this.STATE_TTL) {
      logger.warn({ state }, 'Expired state parameter');
      this.states.delete(state);
      return null;
    }

    return storedState;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<OAuth2TokenResponse> {
    const storedState = this.validateState(state);

    if (!storedState) {
      throw new Error('Invalid or expired state parameter');
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: storedState.redirectUri
      });

      // Add PKCE verifier if available
      if (storedState.codeChallenge) {
        params.append('code_verifier', storedState.codeChallenge);
      }

      logger.debug({ code, state }, 'Exchanging code for token');

      const response = await axios.post<OAuth2TokenResponse>(
        this.config.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Clean up used state
      this.states.delete(state);

      logger.info('Successfully exchanged code for token');

      return response.data;
    } catch (error) {
      logger.error({ error }, 'Failed to exchange code for token');

      if (axios.isAxiosError(error)) {
        throw new Error(`Token exchange failed: ${error.response?.data?.error_description || error.message}`);
      }

      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<OAuth2TokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken
      });

      const response = await axios.post<OAuth2TokenResponse>(
        this.config.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      logger.info('Successfully refreshed token');

      return response.data;
    } catch (error) {
      logger.error({ error }, 'Failed to refresh token');

      if (axios.isAxiosError(error)) {
        throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
      }

      throw error;
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    // ClickUp API doesn't have a revoke endpoint yet
    // This is a placeholder for future implementation
    logger.info('Token revocation not yet supported by ClickUp API');
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [state, data] of this.states.entries()) {
      if (now - data.createdAt > this.STATE_TTL) {
        this.states.delete(state);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug({ cleanedCount }, 'Cleaned up expired OAuth states');
    }
  }
}

export default OAuth2Service;