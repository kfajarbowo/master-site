'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { env } = require('../config/env');

// ── Ensure upload directory exists ──────────────────────────────────────────
const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'sites');
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Storage config: save to uploads/sites/ with site-based filename ──────────
const storage = multer.diskStorage({
	destination(_req, _file, cb) {
		cb(null, uploadDir);
	},
	filename(req, file, cb) {
		// Use siteCode from req.body or req.params for deterministic naming
		const siteCode = (req.body.siteCode || req.params.code || 'unknown')
			.trim()
			.toUpperCase();
		const ext = path.extname(file.originalname).toLowerCase();
		cb(null, `${siteCode}${ext}`);
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

module.exports = { upload };
