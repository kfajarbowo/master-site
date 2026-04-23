'use strict';

require('dotenv').config();

const app            = require('./src/app');
const { logger }     = require('./src/utils/logger');
const { env }        = require('./src/config/env');
const { prisma }     = require('./src/config/database');

const PORT = env.PORT;

async function bootstrap() {
  // Verify DB connection before accepting traffic
  await prisma.$connect();
  logger.info('Database connected');

  const server = app.listen(PORT, () => {
    logger.info('Master IP Server ready');
    logger.info(`  Port      : ${PORT}`);
    logger.info(`  API       : http://localhost:${PORT}/api/v1`);
    logger.info(`  Health    : http://localhost:${PORT}/health`);
    logger.info(`  Dashboard : http://localhost:${PORT}`);
    logger.info(`  Env       : ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  function shutdown(signal) {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed. Bye!');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error(err, '❌  Failed to start server');
  process.exit(1);
});
