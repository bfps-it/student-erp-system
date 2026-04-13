const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * BFPS ERP - Audit Log Middleware
 * Logs all write operations (POST, PUT, PATCH, DELETE) to the AuditLog table.
 *
 * @param {string} module - Module name (e.g., 'students', 'fees', 'auth')
 * @returns {Function} Express middleware (use as response interceptor)
 *
 * @example
 * router.post('/students', authenticate, audit('students'), createStudent);
 */
const audit = (module) => {
  return (req, res, next) => {
    // Only audit write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      // Log only successful operations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user.id,
              module,
              action: `${req.method} ${req.path}`,
              entityId: req.params.id || data?.data?.id?.toString() || null,
              before: req._auditBefore || null,
              after: data?.data || null,
              ipAddress: req.ip || 'unknown',
              userAgent: req.headers['user-agent'] || null,
            },
          });
        } catch (error) {
          // Don't fail the request if audit logging fails
          logger.error(`Audit log error: ${error.message}`);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Helper to store "before" state for audit comparison.
 * Call this before the update/delete operation.
 *
 * @param {object} req - Express request
 * @param {object} beforeData - Data before modification
 */
const setAuditBefore = (req, beforeData) => {
  req._auditBefore = beforeData;
};

module.exports = { audit, setAuditBefore };
