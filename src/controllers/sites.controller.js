'use strict';

const svc = require('../services/sites.service');
const { success } = require('../utils/response');

// ── READ ──────────────────────────────────────────────────────
async function listSites(req, res, next) {
	try {
		const filters = {
			type: req.query.type,
			app: req.query.app,
			region: req.query.region,
			includeRegion: req.query.includeRegion === 'true',
		};
		const sites = await svc.getAllSites(filters);
		return success(res, sites, 200, { total: sites.length });
	} catch (err) {
		next(err);
	}
}

async function getSite(req, res, next) {
	try {
		const includeRegion = req.query.includeRegion === 'true';
		return success(
			res,
			await svc.getSiteByCode(req.params.code, includeRegion)
		);
	} catch (err) {
		next(err);
	}
}

async function getSiteIps(req, res, next) {
	try {
		return success(res, await svc.getSiteIps(req.params.code));
	} catch (err) {
		next(err);
	}
}

async function getSiteIpByApp(req, res, next) {
	try {
		return success(
			res,
			await svc.getSiteIpByAppKey(req.params.code, req.params.appKey)
		);
	} catch (err) {
		next(err);
	}
}

// ── CREATE ────────────────────────────────────────────────────
async function createSite(req, res, next) {
	try {
		const { siteCode, siteName, blockIp, description } = req.body;
		if (!siteCode || !siteName || !blockIp) {
			const { createError } = require('../utils/response');
			return next(
				createError(400, 'siteCode, siteName, dan blockIp wajib diisi.')
			);
		}
		const result = await svc.createSite(req.body);
		return success(res, result, 201);
	} catch (err) {
		next(err);
	}
}

// ── UPDATE ────────────────────────────────────────────────────
async function updateSite(req, res, next) {
	try {
		const result = await svc.updateSite(req.params.code, req.body);
		return success(res, result);
	} catch (err) {
		next(err);
	}
}

async function updateSiteIp(req, res, next) {
	try {
		const result = await svc.updateSiteIp(
			req.params.code,
			req.params.appKey,
			req.body
		);
		return success(res, result);
	} catch (err) {
		next(err);
	}
}

// ── DELETE ────────────────────────────────────────────────────
async function deleteSite(req, res, next) {
	try {
		const result = await svc.deleteSite(req.params.code);
		return success(res, result);
	} catch (err) {
		next(err);
	}
}

module.exports = {
	listSites,
	getSite,
	getSiteIps,
	getSiteIpByApp,
	createSite,
	updateSite,
	updateSiteIp,
	deleteSite,
};
