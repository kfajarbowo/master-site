'use strict';

const { Router }           = require('express');
const { apiKeyMiddleware } = require('../../middlewares/apiKey');
const { requireSession }   = require('../../middlewares/requireSession');
const sitesRoutes          = require('./routes/sites.routes');
const authRoutes           = require('./routes/auth.routes');

const router = Router();

// ── Public info endpoint (no auth required) ──────────────────────────────
router.get('/', (_req, res) => {
  res.json({
    status:    'ok',
    version:   'v1',
    endpoints: [
      'POST /api/v1/auth/login             — login (browser session)',
      'POST /api/v1/auth/logout            — logout',
      'GET  /api/v1/auth/me               — current session info',
      'GET  /api/v1/sites                 — list all sites',
      'GET  /api/v1/sites/:code           — site detail + all IPs',
      'GET  /api/v1/sites/:code/ips       — IP list only',
      'GET  /api/v1/sites/:code/ips/:key  — single app IP',
    ],
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

router.use(dualAuth);

// ── Protected resource routes ─────────────────────────────────────────────
router.use('/sites', sitesRoutes);

module.exports = router;
