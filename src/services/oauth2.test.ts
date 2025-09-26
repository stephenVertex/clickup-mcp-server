/**
 * Tests for OAuth2 Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OAuth2Service } from './oauth2.js';

describe('OAuth2Service', () => {
  let service: OAuth2Service;

  beforeEach(() => {
    service = new OAuth2Service({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      callbackPath: '/callback',
      scope: 'read write'
    });
  });

  describe('generateState', () => {
    it('should generate unique state values', () => {
      const state1 = service.generateState();
      const state2 = service.generateState();

      expect(state1).toBeTruthy();
      expect(state2).toBeTruthy();
      expect(state1).not.toBe(state2);
    });

    it('should generate URL-safe state values', () => {
      const state = service.generateState();
      const urlSafePattern = /^[A-Za-z0-9_-]+$/;

      expect(state).toMatch(urlSafePattern);
    });
  });

  describe('generatePKCE', () => {
    it('should generate verifier and challenge', () => {
      const pkce = service.generatePKCE();

      expect(pkce.verifier).toBeTruthy();
      expect(pkce.challenge).toBeTruthy();
      expect(pkce.verifier).not.toBe(pkce.challenge);
    });

    it('should generate URL-safe PKCE values', () => {
      const pkce = service.generatePKCE();
      const urlSafePattern = /^[A-Za-z0-9_-]+$/;

      expect(pkce.verifier).toMatch(urlSafePattern);
      expect(pkce.challenge).toMatch(urlSafePattern);
    });
  });

  describe('createAuthorizationUrl', () => {
    it('should create valid authorization URL', () => {
      const redirectUri = 'http://localhost:3000/callback';
      const { url, state } = service.createAuthorizationUrl(redirectUri);

      expect(url).toContain('https://auth.example.com/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=' + encodeURIComponent(redirectUri));
      expect(url).toContain('response_type=code');
      expect(url).toContain('state=' + state);
      expect(url).toContain('scope=read+write');
    });

    it('should store state for validation', () => {
      const redirectUri = 'http://localhost:3000/callback';
      const { state } = service.createAuthorizationUrl(redirectUri);

      const storedState = service.validateState(state);
      expect(storedState).toBeTruthy();
      expect(storedState?.state).toBe(state);
      expect(storedState?.redirectUri).toBe(redirectUri);
    });

    it('should use provided state if given', () => {
      const customState = 'custom-state-123';
      const redirectUri = 'http://localhost:3000/callback';
      const { state } = service.createAuthorizationUrl(redirectUri, customState);

      expect(state).toBe(customState);
    });
  });

  describe('validateState', () => {
    it('should validate stored state', () => {
      const redirectUri = 'http://localhost:3000/callback';
      const { state } = service.createAuthorizationUrl(redirectUri);

      const validated = service.validateState(state);
      expect(validated).toBeTruthy();
      expect(validated?.state).toBe(state);
    });

    it('should return null for invalid state', () => {
      const validated = service.validateState('invalid-state');
      expect(validated).toBeNull();
    });

    it('should return null for expired state', () => {
      const redirectUri = 'http://localhost:3000/callback';
      const { state } = service.createAuthorizationUrl(redirectUri);

      // Mock expired state
      const validated = service.validateState(state);
      if (validated) {
        validated.createdAt = Date.now() - 11 * 60 * 1000; // 11 minutes ago
      }

      const revalidated = service.validateState(state);
      expect(revalidated).toBeNull();
    });
  });
});