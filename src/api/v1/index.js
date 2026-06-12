'use strict';

const { Router } = require('express');
const sitesRoutes = require('./routes/sites.routes');
const appsRoutes = require('./routes/apps.routes');
const authRoutes = require('./routes/auth.routes');
const regionsRoutes = require('./routes/regions.routes');
const appsCtrl = require('../../controllers/apps.controller');

const router = Router();

// ── Public info endpoint (no auth required) ──────────────────────────────
router.get('/', (_req, res) => {
	res.json({
		status: 'ok',
		version: 'v1',
		endpoints: {
			auth: [
				'POST /api/v1/auth/login             — login (browser session)',
				'POST /api/v1/auth/logout            — logout',
				'GET  /api/v1/auth/me               — current session info',
			],
			sites: [
<<<<<<< HEAD
				'GET    /api/v1/sites                 — list all sites (public)',
				'GET    /api/v1/sites/:code           — site detail + all IPs (public)',
				'GET    /api/v1/sites/:code/ips       — IP list only (public)',
				'GET    /api/v1/sites/:code/ips/:key  — single app IP (public)',
				'POST   /api/v1/sites                 — create site (public)',
				'PUT    /api/v1/sites/:code           — update site (public)',
				'DELETE /api/v1/sites/:code           — delete site (public)',
				'PATCH  /api/v1/sites/:code/ips/:key  — update single IP (public)',
=======
				'GET  /api/v1/sites                 — list all sites',
				'GET  /api/v1/sites/:code           — site detail + all IPs',
				'GET  /api/v1/sites/:code/ips       — IP list only',
				'GET  /api/v1/sites/:code/ips/:key  — single app IP',
				'POST /api/v1/sites                 — create site (multipart: +image file)',
				'PUT  /api/v1/sites/:code           — update site (multipart: +image file)',
				'DELETE /api/v1/sites/:code         — delete site (auth)',
>>>>>>> 1756bd75c10813c04ffcb0ff780ddcf23234aa87
			],
			apps: [
				'GET  /api/v1/apps                  — list all app types (?type=SERVER|APP)',
				'GET  /api/v1/apps/:appKey          — all IPs for one app across sites (?site=SITE-01)',
				'GET  /api/v1/apps/:appKey/:site    — single IP for app at specific site',
			],
			utility: [
				'GET  /api/v1/lookup?app=bms&site=SITE-01  — quick IP lookup (minimal)',
				'GET  /api/v1/summary                       — dashboard statistics',
			],
			regions: [
				'GET  /api/v1/regions                       — list all regions',
				'GET  /api/v1/regions/:code                 — region detail + sites',
				'GET  /api/v1/regions/:code/sites           — sites with IPs in region',
				'POST /api/v1/regions                       — create region (public)',
				'PUT  /api/v1/regions/:code                 — update region (public)',
				'DELETE /api/v1/regions/:code               — delete region (public)',
			],
		},
		auth: 'All CRUD endpoints are public (no auth required). Browser dashboard still uses session cookie for login.',
	});
});

// ── Auth routes (public — no guard needed to call login) ─────────────────
router.use('/auth', authRoutes);

// ── App-centric routes (GET = public, all read-only) ─────────────────────
router.use('/apps', appsRoutes);

// ── Quick-lookup route (GET = public) ────────────────────────────────────
router.get('/lookup', appsCtrl.lookup);

// ── Summary route (GET = public) ─────────────────────────────────────────
router.get('/summary', appsCtrl.summary);

// ── Site routes (all public — used by desktop app) ────────────────────────
router.use('/sites', sitesRoutes);

// ── Region routes (all public — used by desktop app) ────────────────────
router.use('/regions', regionsRoutes);

module.exports = router;
