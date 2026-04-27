'use strict';

const { Router } = require('express');
const ctrl       = require('../../../controllers/apps.controller');

const router = Router();

// ── GET (Read-only — all public) ──────────────────────────────────────────
router.get('/',                   ctrl.listApps);     // GET /api/v1/apps
router.get('/:appKey',            ctrl.getAppIps);    // GET /api/v1/apps/:appKey
router.get('/:appKey/:siteCode',  ctrl.getAppAtSite); // GET /api/v1/apps/:appKey/:siteCode

module.exports = router;
