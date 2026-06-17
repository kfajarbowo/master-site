'use strict';

const svc = require('../../../services/settings.service');
const { success } = require('../../../utils/response');
const { upload } = require('../../../middlewares/upload');
const { Router } = require('express');

const router = Router();

// ── GET app logo info (public) ──────────────────────────────────
router.get('/logo/info', async (req, res, next) => {
	try {
		return success(res, await svc.hasAppLogo());
	} catch (err) {
		next(err);
	}
});

// ── GET app logo binary (public) ────────────────────────────────
router.get('/logo', async (req, res, next) => {
	try {
		const { blobData, blobMime } = await svc.getAppLogo();
		if (!blobData) {
			return res.status(404).send('No logo');
		}
		res.setHeader('Content-Type', blobMime || 'image/png');
		res.setHeader('Cache-Control', 'public, max-age=86400');
		return res.send(blobData);
	} catch (err) {
		next(err);
	}
});

// ── PUT upload/replace logo ─────────────────────────────────────
router.put('/logo', upload.single('logo'), async (req, res, next) => {
	try {
		if (!req.file) {
			const { createError } = require('../../../utils/response');
			return next(createError(400, 'File logo wajib diunggah.'));
		}
		return success(
			res,
			await svc.updateAppLogo(req.file.buffer, req.file.mimetype)
		);
	} catch (err) {
		next(err);
	}
});

// ── DELETE remove logo ──────────────────────────────────────────
router.delete('/logo', async (req, res, next) => {
	try {
		return success(res, await svc.deleteAppLogo());
	} catch (err) {
		next(err);
	}
});

module.exports = router;
