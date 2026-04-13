const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const Sentry = require('@sentry/node');
const { rateLimit } = require('express-rate-limit');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth.routes');

/**
 * BFPS ERP Backend - Express Application
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
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
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
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
    skip: (req) => req.path === '/api/v1/health',
  })
);

// ---------- Global Rate Limiter (Authenticated Users) ----------
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_AUTHENTICATED, 10) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    return req.ip;
  },
});

app.use('/api/', globalLimiter);

// ---------- Public Endpoint Rate Limiter ----------
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_PUBLIC, 10) || 10,
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
  max: parseInt(process.env.RATE_LIMIT_AUTH, 10) || 5,
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

// ---------- Health Check (unrestricted) ----------
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// Export rate limiters for use in route files
app.locals.publicLimiter = publicLimiter;
app.locals.authLimiter = authLimiter;

// ---------- API Routes ----------
app.use('/api/v1/auth', authRoutes);
// Additional routes will be added as modules are built:
// app.use('/api/v1/students', studentRoutes);
// app.use('/api/v1/attendance', attendanceRoutes);
// app.use('/api/v1/fees', feeRoutes);
// app.use('/api/v1/exams', examRoutes);
// app.use('/api/v1/staff', staffRoutes);
// app.use('/api/v1/leaves', leaveRoutes);
// app.use('/api/v1/leads', leadRoutes);
// app.use('/api/v1/notifications', notificationRoutes);

// ---------- 404 Handler ----------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ---------- Global Error Handler ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user ? req.user.id : null,
  });

  // Report to Sentry in production
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err);
  }

  // CORS error
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message: 'Cross-origin request blocked',
      },
    });
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Prisma known request error
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database error occurred. Please try again.',
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
      },
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An internal server error occurred'
          : err.message,
    },
  });
});

module.exports = app;
