'use strict';

const { prisma }      = require('../config/database');
const { createError } = require('../utils/response');

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSiteCode(code) {
  return code.trim().toUpperCase();
}

function formatSiteDetail(site) {
  return {
    siteCode:    site.siteCode,
    siteName:    site.siteName,
    blockIp:     site.blockIp,
    description: site.description || null,
    ips: site.ips.map((ip) => ({
      appKey:      ip.appType.key,
      appName:     ip.appType.name,
      type:        ip.appType.type,
      highlighted: ip.appType.isHighlighted,
      ip:          ip.ipAddress,
      subnet:      ip.subnet,
      fullIp:      `${ip.ipAddress}${ip.subnet}`,
      port:        ip.port    ?? null,
      note:        ip.note    ?? null,
    })),
  };
}

const IP_INCLUDE = {
  ips: {
    include: {
      appType: {
        select: { key: true, name: true, type: true, isHighlighted: true, sortOrder: true },
      },
    },
    orderBy: { appType: { sortOrder: 'asc' } },
  },
};

// ── READ ─────────────────────────────────────────────────────────────────────

async function getAllSites() {
  const sites = await prisma.site.findMany({
    include: IP_INCLUDE,
    orderBy: { siteCode: 'asc' },
  });
  return sites.map(formatSiteDetail);
}

async function getSiteByCode(rawCode) {
  const siteCode = normalizeSiteCode(rawCode);
  const site = await prisma.site.findUnique({ where: { siteCode }, include: IP_INCLUDE });
  if (!site) throw createError(404, `Site '${siteCode}' tidak ditemukan.`);
  return formatSiteDetail(site);
}

async function getSiteIps(rawCode) {
  const siteCode = normalizeSiteCode(rawCode);
  const site = await prisma.site.findUnique({
    where:  { siteCode },
    select: {
      siteCode: true, siteName: true,
      ips: {
        include: { appType: { select: { key: true, name: true, type: true, isHighlighted: true, sortOrder: true } } },
        orderBy: { appType: { sortOrder: 'asc' } },
      },
    },
  });
  if (!site) throw createError(404, `Site '${siteCode}' tidak ditemukan.`);
  return {
    siteCode: site.siteCode,
    siteName: site.siteName,
    ips: site.ips.map(ip => ({
      appKey:      ip.appType.key,
      appName:     ip.appType.name,
      type:        ip.appType.type,
      highlighted: ip.appType.isHighlighted,
      ip:          ip.ipAddress,
      subnet:      ip.subnet,
      fullIp:      `${ip.ipAddress}${ip.subnet}`,
      port:        ip.port ?? null,
    })),
  };
}

async function getSiteIpByAppKey(rawCode, rawAppKey) {
  const siteCode = normalizeSiteCode(rawCode);
  const appKey   = rawAppKey.toLowerCase();
  const siteIp = await prisma.siteIp.findFirst({
    where: { site: { siteCode }, appType: { key: appKey } },
    include: {
      site:    { select: { siteCode: true, siteName: true } },
      appType: { select: { key: true, name: true, type: true, isHighlighted: true } },
    },
  });
  if (!siteIp) throw createError(404, `IP untuk '${appKey}' di site '${siteCode}' tidak ditemukan.`);
  return {
    siteCode:    siteIp.site.siteCode,
    siteName:    siteIp.site.siteName,
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

// ── CREATE ────────────────────────────────────────────────────────────────────

async function createSite(body) {
  const { siteCode, siteName, blockIp, description } = body;
  const code = normalizeSiteCode(siteCode);

  const exists = await prisma.site.findUnique({ where: { siteCode: code } });
  if (exists) throw createError(409, `Site '${code}' sudah ada.`);

  const site = await prisma.site.create({
    data: { siteCode: code, siteName, blockIp, description: description || null },
    select: { siteCode: true, siteName: true, blockIp: true, description: true },
  });
  return site;
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

async function updateSite(rawCode, body) {
  const siteCode = normalizeSiteCode(rawCode);
  const site = await prisma.site.findUnique({ where: { siteCode } });
  if (!site) throw createError(404, `Site '${siteCode}' tidak ditemukan.`);

  const updated = await prisma.site.update({
    where: { siteCode },
    data: {
      siteName:    body.siteName    ?? undefined,
      blockIp:     body.blockIp     ?? undefined,
      description: body.description ?? undefined,
    },
    select: { siteCode: true, siteName: true, blockIp: true, description: true },
  });
  return updated;
}

async function updateSiteIp(rawCode, rawAppKey, body) {
  const siteCode = normalizeSiteCode(rawCode);
  const appKey   = rawAppKey.toLowerCase();

  const siteIp = await prisma.siteIp.findFirst({
    where: { site: { siteCode }, appType: { key: appKey } },
    include: {
      site:    { select: { siteCode: true, siteName: true } },
      appType: { select: { key: true, name: true, type: true, isHighlighted: true } },
    },
  });
  if (!siteIp) throw createError(404, `IP untuk '${appKey}' di site '${siteCode}' tidak ditemukan.`);

  const updated = await prisma.siteIp.update({
    where: { id: siteIp.id },
    data: {
      ipAddress: body.ipAddress ?? undefined,
      subnet:    body.subnet    ?? undefined,
      port:      body.port !== undefined ? body.port : undefined,
      note:      body.note !== undefined ? body.note : undefined,
    },
  });

  return {
    siteCode:    siteIp.site.siteCode,
    siteName:    siteIp.site.siteName,
    appKey:      siteIp.appType.key,
    appName:     siteIp.appType.name,
    type:        siteIp.appType.type,
    highlighted: siteIp.appType.isHighlighted,
    ip:          updated.ipAddress,
    subnet:      updated.subnet,
    fullIp:      `${updated.ipAddress}${updated.subnet}`,
    port:        updated.port ?? null,
    note:        updated.note ?? null,
  };
}

// ── DELETE ────────────────────────────────────────────────────────────────────

async function deleteSite(rawCode) {
  const siteCode = normalizeSiteCode(rawCode);
  const site = await prisma.site.findUnique({ where: { siteCode } });
  if (!site) throw createError(404, `Site '${siteCode}' tidak ditemukan.`);
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
