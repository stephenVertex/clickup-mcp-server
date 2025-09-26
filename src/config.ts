/**
 * Server configuration
 */

import dotenv from 'dotenv';
import { ServerConfig } from './types.js';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || '3000'}`,
  oauth: {
    clientId: requireEnv('CLICKUP_CLIENT_ID'),
    clientSecret: requireEnv('CLICKUP_CLIENT_SECRET'),
    authorizationUrl: 'https://app.clickup.com/api',
    tokenUrl: 'https://api.clickup.com/api/v2/oauth/token',
    callbackPath: process.env.OAUTH_CALLBACK_PATH || '/oauth/callback',
    scope: process.env.OAUTH_SCOPE || ''
  },
  logLevel: process.env.LOG_LEVEL || 'info'
};

export default config;