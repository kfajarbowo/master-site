'use strict';

const { logger } = require('../utils/logger');
const { errorResponse } = require('../utils/response');

/**
 * Global error handler — must be registered LAST in Express middleware chain.
 * Catches all errors forwarded via next(err).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
	// ── Handle Multer upload errors ──────────────────────────────────────────
	if (err.code === 'LIMIT_FILE_SIZE') {
		return errorResponse(res, 'File terlalu besar. Maksimum 5MB.', 400);
	}
	if (err.code === 'LIMIT_UNEXPECTED_FILE') {
		return errorResponse(
			res,
			'Field name tidak sesuai. Gunakan "image" untuk upload.',
			400
		);
	}
	if (err.message && err.message.includes('not allowed')) {
		// Multer fileFilter rejection
		return errorResponse(res, err.message, 400);
	}

	// ── Handle Prisma errors ─────────────────────────────────────────────────
	if (err.name === 'PrismaClientKnownRequestError') {
		if (err.code === 'P2000') {
			return errorResponse(res, 'Format gagal disimpan: Teks yang Anda masukkan terlalu panjang.', 400);
		}
		if (err.code === 'P2002') {
			return errorResponse(res, 'Data tersebut sudah terdaftar di sistem (Duplikat). Harap gunakan yang lain.', 409);
		}
	}

	const statusCode = err.statusCode || 500;
	const message = err.message || 'Internal server error';

	// Log 5xx errors as errors, 4xx as warnings
	if (statusCode >= 500) {
		logger.error(
			{ err, req: { method: req.method, url: req.originalUrl } },
			message
		);
	} else {
		logger.warn({ statusCode, url: req.originalUrl }, message);
	}

	return errorResponse(res, message, statusCode, err.details || null);
}

module.exports = { errorHandler };
