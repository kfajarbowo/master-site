'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt           = require('bcryptjs');

const prisma = new PrismaClient();

// ── App type definitions ─────────────────────────────────────────────────────
const APP_TYPES = [
  { key: 'router',  name: 'Gateway',        type: 'SERVER', sortOrder: 1, isHighlighted: false, offset: 1, port: null },
  { key: 'proxmox', name: 'Proxmox Server',  type: 'SERVER', sortOrder: 2, isHighlighted: false, offset: 2, port: 8006 },
  { key: 'maps',    name: 'Maps',            type: 'APP',    sortOrder: 3, isHighlighted: false, offset: 3, port: 8503 },
  { key: 'bms',     name: 'Battle Management System', type: 'APP',    sortOrder: 4, isHighlighted: false, offset: 4, port: 8502 },
  { key: 'blm',     name: 'Battle Logistic Management', type: 'APP',    sortOrder: 5, isHighlighted: false, offset: 5, port: null },
  { key: 'eyesee',  name: 'EYESEE',          type: 'APP',    sortOrder: 6, isHighlighted: false,  offset: 6, port: 3000 },
  { key: 'storage', name: 'Storage Server',  type: 'SERVER', sortOrder: 7, isHighlighted: false, offset: 7, port: 9000 },
  { key: 'chat',    name: 'Chat',            type: 'APP',    sortOrder: 8, isHighlighted: false, offset: 8, port: 5000 },
];

// ── Default users ────────────────────────────────────────────────────────────
const DEFAULT_USERS = [
  {
    username:    'admin',
    password:    'admin123',        // ganti setelah setup!
    displayName: 'Administrator',
    role:        'admin',
  },
  {
    username:    'operator',
    password:    'operator123',     // ganti setelah setup!
    displayName: 'Operator',
    role:        'operator',
  },
];

const TOTAL_SITES = 22;

/**
 * Generates IP address for a given site index and offset within /27 block.
 */
function generateIP(siteIndex, offset = 0) {
  const totalBase   = siteIndex * 32;
  const thirdOctet  = Math.floor(totalBase / 256);
  const fourthOctet = (totalBase % 256) + offset;
  return `172.27.${thirdOctet}.${fourthOctet}`;
}

async function main() {
  console.log('🌱  Starting database seed...\n');

  // ── Step 1: Upsert Users ─────────────────────────────────────────────────
  console.log('👤  Seeding users...');
  for (const u of DEFAULT_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where:  { username: u.username },
      update: { displayName: u.displayName, role: u.role, isActive: true },
      create: { username: u.username, passwordHash, displayName: u.displayName, role: u.role },
    });
    console.log(`   ✓  ${u.username} (${u.role}) — password: ${u.password}`);
  }
  console.log();

  // ── Step 2: Upsert AppTypes ──────────────────────────────────────────────
  console.log('📦  Seeding app types...');
  const appTypes = await Promise.all(
    APP_TYPES.map((at) =>
      prisma.appType.upsert({
        where:  { key: at.key },
        update: { name: at.name, type: at.type, sortOrder: at.sortOrder, isHighlighted: at.isHighlighted },
        create: { key: at.key, name: at.name, type: at.type, sortOrder: at.sortOrder, isHighlighted: at.isHighlighted },
      })
    )
  );
  console.log(`   ✅  ${appTypes.length} app types ready\n`);

  // Build lookup: key → appType row
  const appTypeMap = Object.fromEntries(appTypes.map((at) => [at.key, at]));

  // ── Step 3: Upsert Sites + SiteIps ──────────────────────────────────────
  console.log(`🏢  Seeding ${TOTAL_SITES} sites...\n`);
  let totalIPs = 0;

  for (let i = 0; i < TOTAL_SITES; i++) {
    const siteCode = `SITE-${String(i + 1).padStart(2, '0')}`;
    const siteName = `Site ${i + 1}`;
    const blockIp  = `${generateIP(i)}/27`;

    const site = await prisma.site.upsert({
      where:  { siteCode },
      update: { siteName, blockIp },
      create: { siteCode, siteName, blockIp },
    });

    for (const appDef of APP_TYPES) {
      const appType   = appTypeMap[appDef.key];
      const ipAddress = generateIP(i, appDef.offset);

      await prisma.siteIp.upsert({
        where:  { siteId_appTypeId: { siteId: site.id, appTypeId: appType.id } },
        update: { ipAddress, port: appDef.port },
        create: { siteId: site.id, appTypeId: appType.id, ipAddress, subnet: '/27', port: appDef.port },
      });
      totalIPs++;
    }

    console.log(`   ✓  ${siteCode} | ${blockIp}`);
  }

  console.log(`\n🎉  Seed complete!`);  
  console.log(`     Users : ${DEFAULT_USERS.length}`);
  console.log(`     Sites : ${TOTAL_SITES}`);
  console.log(`     IPs   : ${totalIPs}`);
  console.log(`\n⚠️   Remember to change default passwords after setup!`);
}

main()
  .catch((e) => {
    console.error('\n❌  Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
