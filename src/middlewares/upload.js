'use strict';

const multer = require('multer');

// ── Storage config: use memoryStorage to avoid filesystem issues ────────────
// Images are stored in the database (BYTEA column), not on disk.
// This works in any environment (Docker, Lambda, local) — no filesystem dependency.
const storage = multer.memoryStorage();

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
