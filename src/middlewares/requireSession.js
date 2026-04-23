'use strict';

const { createError } = require('../utils/response');

/**
 * Session-based auth guard for browser/dashboard requests.
 * Must be logged in via POST /auth/login to pass this middleware.
 */
function requireSession(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return next(createError(401, 'Login required. Please authenticate via /auth/login.'));
}

module.exports = { requireSession };
