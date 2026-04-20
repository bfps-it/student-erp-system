import http from 'http';
import { AddressInfo } from 'net';

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import app from './app';
import logger from './utils/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { configureCloudinary } from './config/cloudinary';
import { startAttendanceCron } from './cron/attendance-report.cron';
import { startFeeReminderCron } from './cron/fee-reminder.cron';
import { startFeeReconciliationCron } from './cron/fee-reconciliation.cron';

/**
 * BFPS ERP Backend - Server Entry Point (TypeScript)
 */

const PORT: number = parseInt(process.env.PORT ?? '5000', 10);

const server: http.Server = http.createServer(app);

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // Configure Cloudinary
    configureCloudinary();

    // Start cron jobs
    startAttendanceCron();
    startFeeReminderCron();
    startFeeReconciliationCron();

    // Start HTTP server
    server.listen(PORT, (): void => {
      const address = server.address() as AddressInfo;
      logger.info(`BFPS ERP Backend running on port ${address.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
      logger.info(`Health check: http://localhost:${address.port}/api/v1/health`);
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to start server: ${message}`);
    process.exit(1);
  }
}

// ---------- Graceful Shutdown ----------
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close((): void => {
    logger.info('HTTP server closed');
  });

  try {
    await disconnectDatabase();
    await disconnectRedis();
    logger.info('All connections closed. Exiting.');
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error during shutdown: ${message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
process.on('SIGINT', () => { void gracefulShutdown('SIGINT'); });

// ---------- Unhandled Errors ----------
process.on('unhandledRejection', (reason: unknown): void => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled Rejection: ${message}`);
});

process.on('uncaughtException', (error: Error): void => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack ?? 'No stack trace');
  process.exit(1);
});

void startServer();
