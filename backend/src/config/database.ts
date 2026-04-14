import { PrismaClient } from '@prisma/client';

import logger from '../utils/logger';

/**
 * BFPS ERP - Prisma Client Singleton (TypeScript)
 * Prevents multiple instances in development (hot-reload safe).
 */

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });
} else {
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
prisma.$on('error' as never, (e: { message: string }): void => {
  logger.error(`Prisma Error: ${e.message}`);
});

prisma.$on('warn' as never, (e: { message: string }): void => {
  logger.warn(`Prisma Warning: ${e.message}`);
});

if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query' as never, (e: { query: string; duration: number }): void => {
    logger.debug(`Prisma Query: ${e.query} (${e.duration}ms)`);
  });
}

/**
 * Connect to database with retry logic
 */
async function connectDatabase(): Promise<void> {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await prisma.$connect();
      logger.info('Database connected successfully');
      return;
    } catch (error: unknown) {
      retries += 1;
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Database connection attempt ${retries}/${maxRetries} failed: ${message}`);
      if (retries === maxRetries) {
        logger.error('Max database connection retries reached. Exiting.');
        process.exit(1);
      }
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1000 * retries);
      });
    }
  }
}

/**
 * Disconnect from database
 */
async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

export { prisma, connectDatabase, disconnectDatabase };
