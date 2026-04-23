'use strict';

const { env }         = require('../config/env');
const { createError } = require('../utils/response');

/**
 * Enforces X-API-Key header on all routes that use this middleware.
 * Mobile clients must include the key from their configuration.
 *
 * Header: X-API-Key: <value matching .env API_KEY>
 */
function apiKeyMiddleware(req, res, next) {
  // Accept key from header (mobile) OR query param ?key=xxx (browser testing)
  const providedKey = req.headers['x-api-key'] || req.query.key;

  if (!providedKey) {
    return next(createError(401, 'Missing API key. Include X-API-Key header.'));
  }

  if (providedKey !== env.API_KEY) {
    return next(createError(403, 'Invalid API key.'));
  }

  next();
}

module.exports = { apiKeyMiddleware };
