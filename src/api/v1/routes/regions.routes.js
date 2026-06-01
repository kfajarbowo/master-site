'use strict';

const { Router } = require('express');
const ctrl = require('../../../controllers/regions.controller');

const router = Router();

// ── GET (Read) ────────────────────────────────────────────────
router.get('/', ctrl.listRegions); // GET  /api/v1/regions
router.get('/:code', ctrl.getRegion); // GET  /api/v1/regions/:code
router.get('/:code/sites', ctrl.getRegionSites); // GET  /api/v1/regions/:code/sites

// ── POST (Create) ─────────────────────────────────────────────
router.post('/', ctrl.createRegion); // POST /api/v1/regions

// ── PUT (Update) ──────────────────────────────────────────────
router.put('/:code', ctrl.updateRegion); // PUT  /api/v1/regions/:code

// ── DELETE ────────────────────────────────────────────────────
router.delete('/:code', ctrl.deleteRegion); // DELETE /api/v1/regions/:code

module.exports = router;
