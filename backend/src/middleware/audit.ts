import { Response, NextFunction } from 'express';

import { prisma } from '../config/database';
import logger from '../utils/logger';
import type { AuthRequest } from '../types';

/**
 * BFPS ERP - Audit Log Middleware (TypeScript)
 * Logs all write operations (POST, PUT, PATCH, DELETE) to the AuditLog table.
 *
 * @param module - Module name (e.g., 'students', 'fees', 'auth')
 * @returns Express middleware (use as response interceptor)
 *
 * @example
 * router.post('/students', authenticate, audit('students'), createStudent);
 */
const audit = (module: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Only audit write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      next();
      return;
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to intercept the response
    res.json = (data: unknown): Response => {
      // Log only successful operations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Run audit logging asynchronously without blocking the response
        void (async (): Promise<void> => {
          try {
            const responseData = data as Record<string, unknown> | undefined;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            const entityId = req.params.id || (responseData?.data as any)?.id?.toString() || null;

            await prisma.auditLog.create({
              data: {
                userId: req.user!.id,
                module,
                action: `${req.method} ${req.path}`,
                entityId: typeof entityId === 'string' ? entityId : null,
                before: req._auditBefore || null,
                after: (responseData?.data as Record<string, unknown>) || null,
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'] || null,
              },
            });
          } catch (error: unknown) {
            // Don't fail the request if audit logging fails
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Audit log error: ${message}`);
          }
        })();
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
 * @param req - Express request (AuthRequest)
 * @param beforeData - Data before modification
 */
const setAuditBefore = (req: AuthRequest, beforeData: Record<string, unknown>): void => {
  req._auditBefore = beforeData;
};

export { audit, setAuditBefore };
