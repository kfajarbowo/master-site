'use strict';

const svc = require('../services/regions.service');
const { success } = require('../utils/response');

// ── READ ──────────────────────────────────────────────────────
async function listRegions(req, res, next) {
	try {
		const regions = await svc.getAllRegions();
		return success(res, regions, 200, { total: regions.length });
	} catch (err) {
		next(err);
	}
}

async function getRegion(req, res, next) {
	try {
		return success(res, await svc.getRegionByCode(req.params.code));
	} catch (err) {
		next(err);
	}
}

async function getRegionSites(req, res, next) {
	try {
		return success(res, await svc.getRegionSites(req.params.code));
	} catch (err) {
		next(err);
	}
}

// ── CREATE ────────────────────────────────────────────────────
async function createRegion(req, res, next) {
	try {
		const { regionCode, regionName, description } = req.body;
		if (!regionCode || !regionName) {
			const { createError } = require('../utils/response');
			return next(createError(400, 'regionCode dan regionName wajib diisi.'));
		}
		const result = await svc.createRegion(req.body);
		return success(res, result, 201);
	} catch (err) {
		next(err);
	}
}

// ── UPDATE ────────────────────────────────────────────────────
async function updateRegion(req, res, next) {
	try {
		const result = await svc.updateRegion(req.params.code, req.body);
		return success(res, result);
	} catch (err) {
		next(err);
	}
}

// ── DELETE ────────────────────────────────────────────────────
async function deleteRegion(req, res, next) {
	try {
		const result = await svc.deleteRegion(req.params.code);
		return success(res, result);
	} catch (err) {
		next(err);
	}
}

module.exports = {
	listRegions,
	getRegion,
	getRegionSites,
	createRegion,
	updateRegion,
	deleteRegion,
};
