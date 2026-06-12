'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { env } = require('../config/env');

// ── Ensure upload directory exists ──────────────────────────────────────────
const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'sites');
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Storage config: save to uploads/sites/ with temporary unique filename ────
// We use a temp name during upload because req.body.siteCode may not be
// available when multer's filename callback runs (multer processes fields
// in stream order, and the file may arrive before all text fields).
// The controller will rename the file to the final site-based name after
// the body is fully parsed.
const storage = multer.diskStorage({
	destination(_req, _file, cb) {
		cb(null, uploadDir);
	},
	filename(_req, file, cb) {
		// Generate a unique temp filename to avoid conflicts
		const uniqueId = crypto.randomBytes(8).toString('hex');
		const ext = path.extname(file.originalname).toLowerCase();
		cb(null, `tmp_${uniqueId}${ext}`);
	},
});

// ── File filter: only allow image types ──────────────────────────────────────
const ALLOWED_MIMES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
];

function fileFilter(_req, file, cb) {
	if (ALLOWED_MIMES.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(
			new Error(
				`File type "${file.mimetype}" not allowed. Only JPEG, PNG, GIF, WebP, SVG are accepted.`
			),
			false
		);
	}
}

// ── Export configured multer instance ────────────────────────────────────────
// Max 1 image per site, 5MB limit
const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * Rename the uploaded temp file to its final site-based filename.
 * Called by the controller after req.body is fully parsed.
 * @param {object} file - The multer req.file object
 * @param {string} siteCode - The site code to use for the filename
 * @returns {string} The final filename (e.g., "SITE-01.png")
 */
function finalizeFilename(file, siteCode) {
	if (!file) return null;

	const code = (siteCode || 'unknown').trim().toUpperCase();
	const ext = path.extname(file.filename).toLowerCase();
	const finalName = `${code}${ext}`;
	const oldPath = path.join(uploadDir, file.filename);
	const newPath = path.join(uploadDir, finalName);

	// If a file with the final name already exists (e.g., from a previous upload),
	// delete it first to avoid EEXIST error
	if (fs.existsSync(newPath)) {
		try {
			fs.unlinkSync(newPath);
		} catch (err) {
			if (err.code !== 'ENOENT') {
				// Log but don't fail — the rename will overwrite if possible
				const { logger } = require('../utils/logger');
				logger.warn(
					{ err, newPath },
					'Failed to delete existing site image file before rename'
				);
			}
		}
	}

	try {
		fs.renameSync(oldPath, newPath);
	} catch (err) {
		// On some systems, rename may fail if files are locked; fall back to copy + delete
		const { logger } = require('../utils/logger');
		logger.warn(
			{ err, oldPath, newPath },
			'Failed to rename site image file, attempting copy+delete'
		);
		try {
			fs.copyFileSync(oldPath, newPath);
			fs.unlinkSync(oldPath);
		} catch (copyErr) {
			logger.error(
				{ copyErr, oldPath, newPath },
				'Failed to copy+delete site image file'
			);
			// Return the temp filename as fallback — the image will still be accessible
			// but with a non-deterministic name
			return file.filename;
		}
	}

	return finalName;
}

module.exports = { upload, finalizeFilename };
