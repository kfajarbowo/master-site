'use strict';

const { prisma } = require('../config/database');
const { createError } = require('../utils/response');

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSiteCode(code) {
	return code.trim().toUpperCase();
}

function formatSiteDetail(site, includeRegion = false) {
	const result = {
		siteCode: site.siteCode,
		siteName: site.siteName,
		blockIp: site.blockIp,
		description: site.description || null,
		imageUrl: site.imageUrl || null,
		ips: site.ips.map(ip => ({
			appKey: ip.appType.key,
			appName: ip.appType.name,
			type: ip.appType.type,
			highlighted: ip.appType.isHighlighted,
			ip: ip.ipAddress,
			subnet: ip.subnet,
			fullIp: `${ip.ipAddress}${ip.subnet}`,
			port: ip.port ?? null,
			note: ip.note ?? null,
		})),
	};
	// Only add region fields when explicitly requested (backward compat)
	if (includeRegion && site.region) {
		result.regionCode = site.region.regionCode;
		result.regionName = site.region.regionName;
	} else if (includeRegion) {
		result.regionCode = null;
		result.regionName = null;
	}
	return result;
}

const IP_INCLUDE = {
	ips: {
		include: {
			appType: {
				select: {
					key: true,
					name: true,
					type: true,
					isHighlighted: true,
					sortOrder: true,
				},
			},
		},
		orderBy: { appType: { sortOrder: 'asc' } },
	},
};

// ── READ ─────────────────────────────────────────────────────────────────────

async function getAllSites(filters = {}) {
	// Build dynamic IP filter
	const ipWhere = {};
	if (filters.type) {
		ipWhere.appType = { ...ipWhere.appType, type: filters.type.toUpperCase() };
	}
	if (filters.app) {
		ipWhere.appType = { ...ipWhere.appType, key: filters.app.toLowerCase() };
	}

	const hasIpFilter = Object.keys(ipWhere).length > 0;
	const includeRegion = filters.includeRegion === true;

	// Build region filter
	const siteWhere = {};
	if (filters.region) {
		siteWhere.region = { regionCode: filters.region.toUpperCase() };
	}

	const sites = await prisma.site.findMany({
		where: Object.keys(siteWhere).length > 0 ? siteWhere : undefined,
		include: {
			ips: {
				where: hasIpFilter ? ipWhere : undefined,
				include: {
					appType: {
						select: {
							key: true,
							name: true,
							type: true,
							isHighlighted: true,
							sortOrder: true,
						},
					},
				},
				orderBy: { appType: { sortOrder: 'asc' } },
			},
			region: includeRegion
				? { select: { regionCode: true, regionName: true } }
				: false,
		},
		orderBy: { siteCode: 'asc' },
	});
	return sites.map(s => formatSiteDetail(s, includeRegion));
}

async function getSiteByCode(rawCode, includeRegion = false) {
	const siteCode = normalizeSiteCode(rawCode);
	const include = {
		...IP_INCLUDE,
		region: includeRegion
			? { select: { regionCode: true, regionName: true } }
			: false,
	};
	const site = await prisma.site.findUnique({
		where: { siteCode },
		include,
	});
	if (!site) throw createError(404, `Site '${siteCode}' tidak ditemukan.`);
	return formatSiteDetail(site, includeRegion);
}

async function getSiteIps(rawCode) {
	const siteCode = normalizeSiteCode(rawCode);
	const site = await prisma.site.findUnique({
		where: { siteCode },
		select: {
			siteCode: true,
			siteName: true,
			imageUrl: true,
			ips: {
				include: {
					appType: {
						select: {
							key: true,
							name: true,
							type: true,
							isHighlighted: true,
							sortOrder: true,
						},
					},
				},
				orderBy: { appType: { sortOrder: 'asc' } },
			},
		},
	});
	if (!site) throw createError(404, `Site '${siteCode}' tidak ditemukan.`);
	return {
		siteCode: site.siteCode,
		siteName: site.siteName,
		imageUrl: site.imageUrl || null,
		ips: site.ips.map(ip => ({
			appKey: ip.appType.key,
			appName: ip.appType.name,
			type: ip.appType.type,
			highlighted: ip.appType.isHighlighted,
			ip: ip.ipAddress,
			subnet: ip.subnet,
			fullIp: `${ip.ipAddress}${ip.subnet}`,
			port: ip.port ?? null,
		})),
	};
}

async function getSiteIpByAppKey(rawCode, rawAppKey) {
	const siteCode = normalizeSiteCode(rawCode);
	const appKey = rawAppKey.toLowerCase();
	const siteIp = await prisma.siteIp.findFirst({
		where: { site: { siteCode }, appType: { key: appKey } },
		include: {
			site: { select: { siteCode: true, siteName: true, imageUrl: true } },
			appType: {
				select: { key: true, name: true, type: true, isHighlighted: true },
			},
		},
	});
	if (!siteIp)
		throw createError(
			404,
			`IP untuk '${appKey}' di site '${siteCode}' tidak ditemukan.`
		);
	return {
		siteCode: siteIp.site.siteCode,
		siteName: siteIp.site.siteName,
		imageUrl: siteIp.site.imageUrl || null,
		appKey: siteIp.appType.key,
		appName: siteIp.appType.name,
		type: siteIp.appType.type,
		highlighted: siteIp.appType.isHighlighted,
		ip: siteIp.ipAddress,
		subnet: siteIp.subnet,
		fullIp: `${siteIp.ipAddress}${siteIp.subnet}`,
		port: siteIp.port ?? null,
		note: siteIp.note ?? null,
	};
}

// ── CREATE ────────────────────────────────────────────────────────────────────

async function createSite(body, imageUrl = null) {
	const { siteCode, siteName, blockIp, description, ips, regionId } = body;
	const code = normalizeSiteCode(siteCode);

	const exists = await prisma.site.findUnique({ where: { siteCode: code } });
	if (exists) throw createError(409, `Site '${code}' sudah ada.`);

	// Validate regionId if provided
	if (regionId) {
		const region = await prisma.region.findUnique({ where: { id: regionId } });
		if (!region)
			throw createError(400, `Region dengan id '${regionId}' tidak ditemukan.`);
	}

	// Get all app types to auto-create IP rows
	const appTypes = await prisma.appType.findMany({
		orderBy: { sortOrder: 'asc' },
	});

	// Build SiteIp entries from provided ips array, or use empty placeholders
	const ipEntries = appTypes.map(at => {
		const provided = ips?.find(ip => ip.appKey === at.key);
		return {
			appTypeId: at.id,
			ipAddress: provided?.ipAddress || '0.0.0.0',
			subnet: provided?.subnet || '/27',
			port: provided?.port ?? null,
			note: provided?.note ?? null,
		};
	});

	const site = await prisma.site.create({
		data: {
			siteCode: code,
			siteName,
			blockIp,
			description: description || null,
			imageUrl: imageUrl || null,
			regionId: regionId || null,
			ips: { create: ipEntries },
		},
		include: {
			...IP_INCLUDE,
			region: { select: { regionCode: true, regionName: true } },
		},
	});
	return formatSiteDetail(site, true);
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

async function updateSite(rawCode, body, imageUrl = undefined) {
	const siteCode = normalizeSiteCode(rawCode);
	const site = await prisma.site.findUnique({ where: { siteCode } });
	if (!site) throw createError(404, `Site '${siteCode}' tidak ditemukan.`);

	// Validate regionId if provided
	if (body.regionId !== undefined) {
		if (body.regionId !== null) {
			const region = await prisma.region.findUnique({
				where: { id: body.regionId },
			});
			if (!region)
				throw createError(
					400,
					`Region dengan id '${body.regionId}' tidak ditemukan.`
				);
		}
	}

	// If imageUrl is undefined (no new file uploaded), keep existing value.
	// If imageUrl is a string (new file uploaded), delete old image and set new path.
	if (imageUrl && site.imageUrl && site.imageUrl !== imageUrl) {
		// Delete old image file from filesystem
		const fs = require('fs');
		const path = require('path');
		const oldFilePath = path.join(process.cwd(), site.imageUrl);
		try {
			fs.unlinkSync(oldFilePath);
		} catch (err) {
			if (err.code !== 'ENOENT') {
				const { logger } = require('../utils/logger');
				logger.warn(
					{ err, oldFilePath },
					'Failed to delete old site image file'
				);
			}
		}
	}
	const imageUpdate = imageUrl !== undefined ? imageUrl : undefined;

	const updated = await prisma.site.update({
		where: { siteCode },
		data: {
			siteName: body.siteName ?? undefined,
			blockIp: body.blockIp ?? undefined,
			description: body.description ?? undefined,
			imageUrl: imageUpdate,
			regionId: body.regionId !== undefined ? body.regionId : undefined,
		},
		include: {
			region: { select: { regionCode: true, regionName: true } },
		},
	});
	return {
		siteCode: updated.siteCode,
		siteName: updated.siteName,
		blockIp: updated.blockIp,
		description: updated.description || null,
		imageUrl: updated.imageUrl || null,
		regionCode: updated.region?.regionCode ?? null,
		regionName: updated.region?.regionName ?? null,
	};
}

async function updateSiteIp(rawCode, rawAppKey, body) {
	const siteCode = normalizeSiteCode(rawCode);
	const appKey = rawAppKey.toLowerCase();

	const siteIp = await prisma.siteIp.findFirst({
		where: { site: { siteCode }, appType: { key: appKey } },
		include: {
			site: { select: { siteCode: true, siteName: true } },
			appType: {
				select: { key: true, name: true, type: true, isHighlighted: true },
			},
		},
	});
	if (!siteIp)
		throw createError(
			404,
			`IP untuk '${appKey}' di site '${siteCode}' tidak ditemukan.`
		);

	const updated = await prisma.siteIp.update({
		where: { id: siteIp.id },
		data: {
			ipAddress: body.ipAddress ?? undefined,
			subnet: body.subnet ?? undefined,
			port: body.port !== undefined ? body.port : undefined,
			note: body.note !== undefined ? body.note : undefined,
		},
	});

	return {
		siteCode: siteIp.site.siteCode,
		siteName: siteIp.site.siteName,
		appKey: siteIp.appType.key,
		appName: siteIp.appType.name,
		type: siteIp.appType.type,
		highlighted: siteIp.appType.isHighlighted,
		ip: updated.ipAddress,
		subnet: updated.subnet,
		fullIp: `${updated.ipAddress}${updated.subnet}`,
		port: updated.port ?? null,
		note: updated.note ?? null,
	};
}

// ── DELETE ────────────────────────────────────────────────────────────────────

async function deleteSite(rawCode) {
	const siteCode = normalizeSiteCode(rawCode);
	const site = await prisma.site.findUnique({ where: { siteCode } });
	if (!site) throw createError(404, `Site '${siteCode}' tidak ditemukan.`);

	// Delete associated image file from filesystem
	if (site.imageUrl) {
		const fs = require('fs');
		const path = require('path');
		const filePath = path.join(process.cwd(), site.imageUrl);
		try {
			fs.unlinkSync(filePath);
		} catch (err) {
			// File may not exist (e.g., already deleted or never uploaded) — ignore
			if (err.code !== 'ENOENT') {
				const { logger } = require('../utils/logger');
				logger.warn({ err, filePath }, 'Failed to delete site image file');
			}
		}
	}

	// Cascade delete via Prisma schema (onDelete: Cascade)
	await prisma.site.delete({ where: { siteCode } });
	return { deleted: siteCode };
}

module.exports = {
	getAllSites,
	getSiteByCode,
	getSiteIps,
	getSiteIpByAppKey,
	createSite,
	updateSite,
	updateSiteIp,
	deleteSite,
};
