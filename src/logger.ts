/**
 * Logger configuration using Pino
 */

import pino from 'pino';
import config from './config.js';

export const logger = pino({
  level: config.logLevel,
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  } : undefined
});

export default logger;