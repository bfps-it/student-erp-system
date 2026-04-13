const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

/**
 * BFPS ERP - Prisma Client Singleton
 * Prevents multiple instances in development (hot-reload safe).
 */

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });
} else {
  // In development, reuse the client across hot-reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });
  }
  prisma = global.__prisma;
}

// Log Prisma events
prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`);
});

prisma.$on('warn', (e) => {
  logger.warn(`Prisma Warning: ${e.message}`);
});

if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    logger.debug(`Prisma Query: ${e.query} (${e.duration}ms)`);
  });
}

/**
 * Connect to database with retry logic
 */
async function connectDatabase() {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await prisma.$connect();
      logger.info('Database connected successfully');
      return;
    } catch (error) {
      retries += 1;
      logger.error(`Database connection attempt ${retries}/${maxRetries} failed: ${error.message}`);
      if (retries === maxRetries) {
        logger.error('Max database connection retries reached. Exiting.');
        process.exit(1);
      }
      // Wait before retry (exponential backoff)
      await new Promise((resolve) => {
        setTimeout(resolve, 1000 * retries);
      });
    }
  }
}

/**
 * Disconnect from database
 */
async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};
