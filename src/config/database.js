'use strict';

const { PrismaClient } = require('@prisma/client');
const { logger }       = require('../utils/logger');

// Singleton pattern — reuse the same Prisma instance across the app
const prisma = new PrismaClient({
  log: [
    { level: 'warn',  emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

prisma.$on('warn',  (e) => logger.warn(e,  'Prisma warning'));
prisma.$on('error', (e) => logger.error(e, 'Prisma error'));

module.exports = { prisma };
