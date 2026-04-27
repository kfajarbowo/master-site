'use strict';

const { Router }           = require('express');
const { apiKeyMiddleware } = require('../../middlewares/apiKey');
const { requireSession }   = require('../../middlewares/requireSession');
const sitesRoutes          = require('./routes/sites.routes');
const appsRoutes           = require('./routes/apps.routes');
const authRoutes           = require('./routes/auth.routes');
const appsCtrl             = require('../../controllers/apps.controller');

const router = Router();

// ── Public info endpoint (no auth required) ──────────────────────────────
router.get('/', (_req, res) => {
  res.json({
    status:    'ok',
    version:   'v1',
    endpoints: {
      auth: [
        'POST /api/v1/auth/login             — login (browser session)',
        'POST /api/v1/auth/logout            — logout',
        'GET  /api/v1/auth/me               — current session info',
      ],
      sites: [
        'GET  /api/v1/sites                 — list all sites',
        'GET  /api/v1/sites/:code           — site detail + all IPs',
        'GET  /api/v1/sites/:code/ips       — IP list only',
        'GET  /api/v1/sites/:code/ips/:key  — single app IP',
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
    },
    auth: 'Browser dashboard: session cookie | Mobile/API: X-API-Key header',
  });
});

// ── Auth routes (public — no guard needed to call login) ─────────────────
router.use('/auth', authRoutes);

// ── Dual-auth middleware: browser session OR API key ─────────────────────
// Passes if either condition is met, rejects only when both fail.
function dualAuth(req, res, next) {
  // 1. Valid session? → OK
  if (req.session && req.session.userId) return next();

  // 2. Valid API key? → OK (for mobile/CLI clients)
  const provided = req.headers['x-api-key'] || req.query.key;
  const { env }  = require('../../config/env');
  if (provided && provided === env.API_KEY) return next();

  // 3. Neither → reject
  const { createError } = require('../../utils/response');
  return next(createError(401, 'Authentication required. Use session login or X-API-Key header.'));
}

// ── App-centric routes (GET = public, all read-only) ─────────────────────
router.use('/apps', appsRoutes);

// ── Quick-lookup route (GET = public) ────────────────────────────────────
router.get('/lookup', appsCtrl.lookup);

// ── Summary route (GET = public) ─────────────────────────────────────────
router.get('/summary', appsCtrl.summary);

// ── Protected resource routes (GET is public, Mutation is protected) ───────
router.use('/sites', (req, res, next) => {
  if (req.method === 'GET') return next();
  return dualAuth(req, res, next);
}, sitesRoutes);

module.exports = router;
