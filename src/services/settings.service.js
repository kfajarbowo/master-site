'use strict';

const { prisma } = require('../config/database');

const LOGO_KEY = 'app_logo';

/**
 * Get app logo binary data.
 * Returns { blobData: Buffer | null, blobMime: string | null }
 */
async function getAppLogo() {
	const setting = await prisma.appSetting.findUnique({
		where: { key: LOGO_KEY },
		select: { blobData: true, blobMime: true },
	});
	return {
		blobData: setting?.blobData || null,
		blobMime: setting?.blobMime || null,
	};
}

/**
 * Check if app logo exists (without loading binary).
 */
async function hasAppLogo() {
	const setting = await prisma.appSetting.findUnique({
		where: { key: LOGO_KEY },
		select: { id: true, blobMime: true, updatedAt: true },
	});
	return {
		hasLogo: !!setting?.blobMime,
		logoUrl: setting?.blobMime ? '/api/v1/settings/logo' : null,
		updatedAt: setting?.updatedAt?.getTime() || null,
	};
}

/**
 * Upload or replace app logo.
 */
async function updateAppLogo(logoData, logoMime) {
	await prisma.appSetting.upsert({
		where: { key: LOGO_KEY },
		update: { blobData: logoData, blobMime: logoMime },
		create: { key: LOGO_KEY, blobData: logoData, blobMime: logoMime },
	});
	return {
		hasLogo: true,
		logoUrl: '/api/v1/settings/logo',
	};
}

/**
 * Remove app logo.
 */
async function deleteAppLogo() {
	const existing = await prisma.appSetting.findUnique({
		where: { key: LOGO_KEY },
	});
	if (existing) {
		await prisma.appSetting.update({
			where: { key: LOGO_KEY },
			data: { blobData: null, blobMime: null },
		});
	}
	return { logoRemoved: true };
}

module.exports = {
	getAppLogo,
	hasAppLogo,
	updateAppLogo,
	deleteAppLogo,
};
