import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import rateLimit from 'express-rate-limit';

import logger from './utils/logger';

// Route imports
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';

/**
 * BFPS ERP Backend - Express Application (TypeScript)
 * Configured with: Helmet, CORS, Morgan, Compression, Rate Limiting, Sentry
 */

// Initialize Sentry (only in production)
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
  });
}

const app = express();

// ---------- Security Headers (Helmet) ----------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", 'https://api.razorpay.com'],
        frameSrc: ["'self'", 'https://api.razorpay.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ---------- CORS ----------
const allowedOrigins: string[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin: string) => origin.trim())
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ): void => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Blog-Automation-Key',
    ],
    maxAge: 86400, // 24 hours preflight cache
  })
);

// ---------- Compression ----------
app.use(compression());

// ---------- Body Parsing ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------- Request Logging (Morgan -> Winston) ----------
const morganFormat: string = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string): void => {
        logger.http(message.trim());
      },
    },
    skip: (req: Request): boolean => req.path === '/api/v1/health',
  })
);

// ---------- Global Rate Limiter ----------
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_AUTHENTICATED ?? '200', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  keyGenerator: (req: Request): string => {
    const authReq = req as import('./types').AuthRequest;
    if (authReq.user?.id) {
      return `user:${authReq.user.id}`;
    }
    return req.ip ?? 'unknown';
  },
});

app.use('/api/', globalLimiter);

// ---------- Public Endpoint Rate Limiter ----------
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_PUBLIC ?? '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please wait before submitting again.',
    },
  },
});

// ---------- Auth Endpoint Rate Limiter ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH ?? '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Too many login attempts. Account temporarily locked. Try again in 15 minutes.',
    },
  },
});

// ---------- Health Check ----------
app.get('/api/v1/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV ?? 'development',
    },
  });
});

// Export rate limiters for use in route files
app.locals.publicLimiter = publicLimiter;
app.locals.authLimiter = authLimiter;

// ---------- API Routes ----------
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);

// ---------- 404 Handler ----------
app.use((req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ---------- Global Error Handler ----------
app.use((err: Error & { statusCode?: number; code?: string }, req: Request, res: Response, _next: NextFunction): void => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: (req as import('./types').AuthRequest).user?.id ?? null,
  });

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err);
  }

  // CORS error
  if (err.message?.includes('CORS')) {
    res.status(403).json({
      success: false,
      error: { code: 'CORS_ERROR', message: 'Cross-origin request blocked' },
    });
    return;
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    const zodErr = err as Error & { errors: Array<{ path: string[]; message: string }> };
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: zodErr.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Prisma known request error
  if (err.code?.startsWith('P')) {
    res.status(400).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'A database error occurred. Please try again.' },
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
      },
    });
    return;
  }

  // Default error response
  const statusCode: number = err.statusCode ?? 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An internal server error occurred' : err.message,
    },
  });
});

export default app;
