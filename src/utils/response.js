'use strict';

/**
 * Standard success response envelope.
 * Shape: { status: 'success', data, meta? }
 */
function success(res, data, statusCode = 200, meta = null) {
  const body = { status: 'success', data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

/**
 * Standard error response envelope.
 * Shape: { status: 'error', message, details? }
 */
function errorResponse(res, message, statusCode = 500, details = null) {
  const body = { status: 'error', message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

/**
 * Creates an Error with an attached HTTP status code.
 * Used by controllers/middleware to throw structured errors.
 */
function createError(statusCode, message, details = null) {
  const err    = new Error(message);
  err.statusCode = statusCode;
  if (details) err.details = details;
  return err;
}

module.exports = { success, errorResponse, createError };
