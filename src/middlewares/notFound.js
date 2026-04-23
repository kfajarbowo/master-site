'use strict';

const { errorResponse } = require('../utils/response');

/**
 * 404 handler for unmatched API routes.
 * Mount this AFTER all route definitions.
 */
function notFound(req, res) {
  return errorResponse(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = { notFound };
