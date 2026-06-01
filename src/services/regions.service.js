'use strict';

const { prisma } = require('../config/database');
const { createError } = require('../utils/response');

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRegionCode(code) {
	return code.trim().toUpperCase();
}

function formatRegionDetail(region) {
	const sites = region.sites.map(site => {
		return {
			siteCode: site.siteCode,
			siteName: site.siteName,
			blockIp: site.blockIp,
			description: site.description || null,
		};
	});
	return {
		id: region.id,
		regionCode: region.regionCode,
		regionName: region.regionName,
		description: region.description || null,
		sites,
	};
}

const SITE_INCLUDE = {
	sites: {
		select: {
			siteCode: true,
			siteName: true,
			blockIp: true,
			description: true,
		},
		orderBy: { siteCode: 'asc' },
	},
};

// ── READ ─────────────────────────────────────────────────────────────────────

async function getAllRegions() {
	const regions = await prisma.region.findMany({
		include: SITE_INCLUDE,
		orderBy: { regionCode: 'asc' },
	});
	return regions.map(formatRegionDetail);
}

async function getRegionByCode(rawCode) {
	const regionCode = normalizeRegionCode(rawCode);
	const region = await prisma.region.findUnique({
		where: { regionCode },
		include: SITE_INCLUDE,
	});
	if (!region)
		throw createError(404, `Region '${regionCode}' tidak ditemukan.`);
	return formatRegionDetail(region);
}

async function getRegionSites(rawCode) {
	const regionCode = normalizeRegionCode(rawCode);
	const region = await prisma.region.findUnique({
		where: { regionCode },
		include: {
			sites: {
				include: {
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
				orderBy: { siteCode: 'asc' },
			},
		},
	});
	if (!region)
		throw createError(404, `Region '${regionCode}' tidak ditemukan.`);
	const mappedSites = region.sites.map(site => {
		const mappedIps = site.ips.map(ip => {
			return {
				appKey: ip.appType.key,
				appName: ip.appType.name,
				type: ip.appType.type,
				highlighted: ip.appType.isHighlighted,
				ip: ip.ipAddress,
				subnet: ip.subnet,
				fullIp: `${ip.ipAddress}${ip.subnet}`,
				port: ip.port ?? null,
				note: ip.note ?? null,
			};
		});
		return {
			siteCode: site.siteCode,
			siteName: site.siteName,
			blockIp: site.blockIp,
			description: site.description || null,
			ips: mappedIps,
		};
	});
	return {
		id: region.id,
		regionCode: region.regionCode,
		regionName: region.regionName,
		totalSites: region.sites.length,
		sites: mappedSites,
	};
}

// ── CREATE ────────────────────────────────────────────────────────────────────

async function createRegion(body) {
	const { regionCode, regionName, description } = body;
	const code = normalizeRegionCode(regionCode);

	const exists = await prisma.region.findUnique({
		where: { regionCode: code },
	});
	if (exists) throw createError(409, `Region '${code}' sudah ada.`);

	const region = await prisma.region.create({
		data: { regionCode: code, regionName, description: description || null },
		include: SITE_INCLUDE,
	});
	return formatRegionDetail(region);
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

async function updateRegion(rawCode, body) {
	const regionCode = normalizeRegionCode(rawCode);
	const region = await prisma.region.findUnique({ where: { regionCode } });
	if (!region)
		throw createError(404, `Region '${regionCode}' tidak ditemukan.`);

	const updated = await prisma.region.update({
		where: { regionCode },
		data: {
			regionName: body.regionName ?? undefined,
			description: body.description ?? undefined,
		},
		include: SITE_INCLUDE,
	});
	return formatRegionDetail(updated);
}

// ── DELETE ────────────────────────────────────────────────────────────────────

async function deleteRegion(rawCode) {
	const regionCode = normalizeRegionCode(rawCode);
	const region = await prisma.region.findUnique({ where: { regionCode } });
	if (!region)
		throw createError(404, `Region '${regionCode}' tidak ditemukan.`);
	// Sites will have regionId set to null via ON DELETE SET NULL
	await prisma.region.delete({ where: { regionCode } });
	return { deleted: regionCode };
}

module.exports = {
	getAllRegions,
	getRegionByCode,
	getRegionSites,
	createRegion,
	updateRegion,
	deleteRegion,
};
