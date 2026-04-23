'use strict';

const pino = require('pino');

// Lazy-load env to avoid circular dependency
function getEnv() {
  try {
    return require('../config/env').env;
  } catch {
    return { NODE_ENV: process.env.NODE_ENV || 'development' };
  }
}

const env = getEnv();

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize:      true,
            translateTime: 'SYS:standard',
            ignore:        'pid,hostname',
            messageFormat: '{msg}',
          },
        }
      : undefined,
});

module.exports = { logger };
