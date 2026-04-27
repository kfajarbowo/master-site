'use strict';

const { prisma }      = require('../config/database');
const { createError } = require('../utils/response');

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(key) {
  return key.trim().toLowerCase();
}

function normalizeSiteCode(code) {
  return code.trim().toUpperCase();
}

function formatIpEntry(ip) {
  return {
    siteCode:    ip.site.siteCode,
    siteName:    ip.site.siteName,
    appKey:      ip.appType.key,
    appName:     ip.appType.name,
    type:        ip.appType.type,
    highlighted: ip.appType.isHighlighted,
    ip:          ip.ipAddress,
    subnet:      ip.subnet,
    fullIp:      `${ip.ipAddress}${ip.subnet}`,
    port:        ip.port ?? null,
    note:        ip.note ?? null,
  };
}

// ── READ: App Types ──────────────────────────────────────────────────────────

/**
 * List all registered app types.
 * Optional query filters: ?type=SERVER|APP
 */
async function getAllAppTypes(filters = {}) {
  const where = {};
  if (filters.type) {
    const t = filters.type.toUpperCase();
    if (!['SERVER', 'APP'].includes(t)) {
      throw createError(400, `Invalid type filter '${filters.type}'. Must be SERVER or APP.`);
    }
    where.type = t;
  }

  const apps = await prisma.appType.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
    select: {
      key: true, name: true, type: true, sortOrder: true, isHighlighted: true,
      _count: { select: { siteIps: true } },
    },
  });

  return apps.map(a => ({
    key:         a.key,
    name:        a.name,
    type:        a.type,
    sortOrder:   a.sortOrder,
    highlighted: a.isHighlighted,
    totalSites:  a._count.siteIps,
  }));
}

// ── READ: All IPs for a specific app ─────────────────────────────────────────

/**
 * Get all IPs across all sites for a given app type key.
 * Example: GET /api/v1/apps/vcomm → all VComm IPs
 *
 * Optional query filters: ?site=SITE-01  (filter to single site)
 */
async function getIpsByApp(rawAppKey, filters = {}) {
  const appKey = normalizeKey(rawAppKey);

  // Validate app key exists
  const appType = await prisma.appType.findUnique({ where: { key: appKey } });
  if (!appType) throw createError(404, `App type '${appKey}' tidak ditemukan.`);

  const where = { appType: { key: appKey } };

  // Optional: filter by site
  if (filters.site) {
    where.site = { siteCode: normalizeSiteCode(filters.site) };
  }

  const ips = await prisma.siteIp.findMany({
    where,
    include: {
      site:    { select: { siteCode: true, siteName: true, blockIp: true } },
      appType: { select: { key: true, name: true, type: true, isHighlighted: true } },
    },
    orderBy: { site: { siteCode: 'asc' } },
  });

  return {
    appKey:   appType.key,
    appName:  appType.name,
    type:     appType.type,
    total:    ips.length,
    sites: ips.map(ip => ({
      siteCode: ip.site.siteCode,
      siteName: ip.site.siteName,
      blockIp:  ip.site.blockIp,
      ip:       ip.ipAddress,
      subnet:   ip.subnet,
      fullIp:   `${ip.ipAddress}${ip.subnet}`,
      port:     ip.port ?? null,
      note:     ip.note ?? null,
    })),
  };
}

// ── READ: Specific app IP at a specific site ─────────────────────────────────

/**
 * Get a single IP entry: app + site intersection.
 * Example: GET /api/v1/apps/bms/SITE-01
 */
async function getAppAtSite(rawAppKey, rawSiteCode) {
  const appKey   = normalizeKey(rawAppKey);
  const siteCode = normalizeSiteCode(rawSiteCode);

  const siteIp = await prisma.siteIp.findFirst({
    where: { site: { siteCode }, appType: { key: appKey } },
    include: {
      site:    { select: { siteCode: true, siteName: true, blockIp: true } },
      appType: { select: { key: true, name: true, type: true, isHighlighted: true } },
    },
  });

  if (!siteIp) {
    throw createError(404, `IP untuk app '${appKey}' di site '${siteCode}' tidak ditemukan.`);
  }

  return {
    siteCode:    siteIp.site.siteCode,
    siteName:    siteIp.site.siteName,
    blockIp:     siteIp.site.blockIp,
    appKey:      siteIp.appType.key,
    appName:     siteIp.appType.name,
    type:        siteIp.appType.type,
    highlighted: siteIp.appType.isHighlighted,
    ip:          siteIp.ipAddress,
    subnet:      siteIp.subnet,
    fullIp:      `${siteIp.ipAddress}${siteIp.subnet}`,
    port:        siteIp.port ?? null,
    note:        siteIp.note ?? null,
  };
}

// ── READ: Quick Lookup ───────────────────────────────────────────────────────

/**
 * Quick lookup: returns the minimal info for a given appKey + siteCode combo.
 * Example: GET /api/v1/lookup?app=bms&site=SITE-01
 * Returns JUST the IP — designed for machine consumption.
 */
async function quickLookup(rawAppKey, rawSiteCode) {
  if (!rawAppKey || !rawSiteCode) {
    throw createError(400, 'Both "app" and "site" query parameters are required.');
  }

  const appKey   = normalizeKey(rawAppKey);
  const siteCode = normalizeSiteCode(rawSiteCode);

  const siteIp = await prisma.siteIp.findFirst({
    where: { site: { siteCode }, appType: { key: appKey } },
    include: {
      site:    { select: { siteCode: true } },
      appType: { select: { key: true } },
    },
  });

  if (!siteIp) {
    throw createError(404, `No IP found for app '${appKey}' at site '${siteCode}'.`);
  }

  return {
    app:    appKey,
    site:   siteCode,
    ip:     siteIp.ipAddress,
    port:   siteIp.port ?? null,
    subnet: siteIp.subnet,
    fullIp: `${siteIp.ipAddress}${siteIp.subnet}`,
    host:   siteIp.port ? `${siteIp.ipAddress}:${siteIp.port}` : siteIp.ipAddress,
  };
}

// ── READ: Summary / statistics ───────────────────────────────────────────────

/**
 * Dashboard-style summary: counts per app, per category.
 * Example: GET /api/v1/summary
 */
async function getSummary() {
  const [totalSites, totalIps, appTypes, categoryCounts] = await Promise.all([
    prisma.site.count(),
    prisma.siteIp.count(),
    prisma.appType.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        key: true, name: true, type: true,
        _count: { select: { siteIps: true } },
      },
    }),
    prisma.appType.groupBy({
      by: ['type'],
      _count: { _all: true },
    }),
  ]);

  return {
    totalSites,
    totalIps,
    categories: categoryCounts.map(c => ({
      type:  c.type,
      count: c._count._all,
    })),
    apps: appTypes.map(a => ({
      key:        a.key,
      name:       a.name,
      type:       a.type,
      totalSites: a._count.siteIps,
    })),
  };
}

module.exports = {
  getAllAppTypes,
  getIpsByApp,
  getAppAtSite,
  quickLookup,
  getSummary,
};
