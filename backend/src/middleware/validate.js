const { z } = require('zod');

/**
 * BFPS ERP - Validation Middleware Factory
 * Creates Express middleware from Zod schemas.
 *
 * @param {z.ZodSchema} schema - Zod schema for validation
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 *
 * @example
 * const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
 * router.post('/login', validate(loginSchema), loginController);
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        return res.status(400).json({
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
      }

      // Replace request data with parsed (and coerced) values
      req[source] = result.data;
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed unexpectedly.',
        },
      });
    }
  };
};

module.exports = { validate };
