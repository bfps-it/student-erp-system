import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

import logger from '../utils/logger';

/**
 * BFPS ERP - Validation Middleware Factory (TypeScript)
 * Creates Express middleware from Zod schemas.
 *
 * @param schema - Zod schema for validation
 * @param source - Request property to validate ('body', 'query', 'params')
 * @returns Express middleware
 *
 * @example
 * const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
 * router.post('/login', validate(loginSchema), loginController);
 */
const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: result.error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
        });
        return;
      }

      // Replace request data with parsed (and coerced) values
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      req[source] = result.data;
      next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Validation middleware error: ${message}`);
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed unexpectedly.',
        },
      });
    }
  };
};

export { validate };
