'use strict';

const { logger } = require('../utils/logger');

/**
 * Minimal request logger middleware.
 * Logs: method, url, status, response time (ms).
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info(
      {
        method:     req.method,
        url:        req.originalUrl,
        statusCode: res.statusCode,
        ms,
      },
      `${req.method} ${req.originalUrl} ${res.statusCode} — ${ms}ms`
    );
  });

  next();
}

module.exports = { requestLogger };
