'use strict';

const { logger }        = require('../utils/logger');
const { errorResponse } = require('../utils/response');

/**
 * Global error handler — must be registered LAST in Express middleware chain.
 * Catches all errors forwarded via next(err).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Internal server error';

  // Log 5xx errors as errors, 4xx as warnings
  if (statusCode >= 500) {
    logger.error({ err, req: { method: req.method, url: req.originalUrl } }, message);
  } else {
    logger.warn({ statusCode, url: req.originalUrl }, message);
  }

  return errorResponse(res, message, statusCode, err.details || null);
}

module.exports = { errorHandler };
