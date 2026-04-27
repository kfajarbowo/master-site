'use strict';

const svc         = require('../services/apps.service');
const { success } = require('../utils/response');

// ── GET /api/v1/apps ─────────────────────────────────────────────────────────
// List all app types with optional ?type=SERVER|APP filter
async function listApps(req, res, next) {
  try {
    const apps = await svc.getAllAppTypes({ type: req.query.type });
    return success(res, apps, 200, { total: apps.length });
  } catch (err) { next(err); }
}

// ── GET /api/v1/apps/:appKey ─────────────────────────────────────────────────
// All IPs for a specific app across all sites.  Optional ?site=SITE-01 filter.
async function getAppIps(req, res, next) {
  try {
    return success(res, await svc.getIpsByApp(req.params.appKey, { site: req.query.site }));
  } catch (err) { next(err); }
}

// ── GET /api/v1/apps/:appKey/:siteCode ───────────────────────────────────────
// Single IP for a specific app at a specific site.
async function getAppAtSite(req, res, next) {
  try {
    return success(res, await svc.getAppAtSite(req.params.appKey, req.params.siteCode));
  } catch (err) { next(err); }
}

// ── GET /api/v1/lookup?app=bms&site=SITE-01 ─────────────────────────────────
// Quick machine-consumable IP lookup.
async function lookup(req, res, next) {
  try {
    return success(res, await svc.quickLookup(req.query.app, req.query.site));
  } catch (err) { next(err); }
}

// ── GET /api/v1/summary ──────────────────────────────────────────────────────
// Dashboard statistics.
async function summary(req, res, next) {
  try {
    return success(res, await svc.getSummary());
  } catch (err) { next(err); }
}

module.exports = { listApps, getAppIps, getAppAtSite, lookup, summary };
