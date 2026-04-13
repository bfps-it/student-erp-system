require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

/**
 * BFPS ERP Backend - Server Entry Point
 * Starts the Express server and handles graceful shutdown.
 */

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`============================================`);
  logger.info(`  BFPS ERP Backend Server`);
  logger.info(`  Environment : ${process.env.NODE_ENV || 'development'}`);
  logger.info(`  Port        : ${PORT}`);
  logger.info(`  API Version : /api/${process.env.API_VERSION || 'v1'}/`);
  logger.info(`  Health      : http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/v1/health`);
  logger.info(`============================================`);
});

// ---------- Graceful Shutdown ----------
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    logger.info('HTTP server closed.');

    // Close database connections
    // prisma.$disconnect() will be called here once Prisma is initialized

    // Close Redis connections
    // redis.disconnect() will be called here once Redis is initialized

    logger.info('All connections closed. Server shut down gracefully.');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 30 seconds. Forcing exit.');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ---------- Unhandled Errors ----------
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise: String(promise),
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
  });
  // Exit after uncaught exception — let process manager restart
  process.exit(1);
});

module.exports = server;
