'use strict';

const { Router } = require('express');
const ctrl       = require('../../../controllers/sites.controller');

const router = Router();

// ── GET (Read) ────────────────────────────────────────────────
router.get('/',                     ctrl.listSites);      // GET  /api/v1/sites
router.get('/:code',                ctrl.getSite);        // GET  /api/v1/sites/:code
router.get('/:code/ips',            ctrl.getSiteIps);     // GET  /api/v1/sites/:code/ips
router.get('/:code/ips/:appKey',    ctrl.getSiteIpByApp); // GET  /api/v1/sites/:code/ips/:appKey

// ── POST (Create) ─────────────────────────────────────────────
router.post('/',                    ctrl.createSite);     // POST /api/v1/sites

// ── PUT (Update site metadata) ────────────────────────────────
router.put('/:code',                ctrl.updateSite);     // PUT  /api/v1/sites/:code

// ── PATCH (Update single IP) ──────────────────────────────────
router.patch('/:code/ips/:appKey',  ctrl.updateSiteIp);  // PATCH /api/v1/sites/:code/ips/:appKey

// ── DELETE ────────────────────────────────────────────────────
router.delete('/:code',             ctrl.deleteSite);     // DELETE /api/v1/sites/:code

module.exports = router;
