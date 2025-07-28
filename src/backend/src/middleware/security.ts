import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, URL: ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    });
  }
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many login attempts from this IP, please try again later.'
    });
  }
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 file uploads per hour
  message: {
    success: false,
    error: 'Too many file uploads from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many file uploads from this IP, please try again later.'
    });
  }
});

// Slow down middleware for progressive delays
export const progressiveSlowDown: any = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: (hits: number) => Math.min(hits * 100, 2000), // Increase delay by 100ms per request, max 2 seconds
  maxDelayMs: 2000 // Max delay of 2 seconds
});

// Input validation and sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove potentially dangerous characters from query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = (req.query[key] as string)
        .replace(/[<>\"'%;()&+]/g, '') // Remove potentially dangerous characters
        .trim();
    }
  }

  // Remove potentially dangerous characters from body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/[<>\"'%;()&+]/g, '') // Remove potentially dangerous characters
          .trim();
      }
    }
  }

  next();
};

// Security headers middleware (additional to helmet)
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

// IP whitelisting middleware (for admin operations)
export const ipWhitelist = (allowedIPs: string[] = ['127.0.0.1', '::1']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn(`Unauthorized IP access attempt: ${clientIP} to ${req.originalUrl}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied from this IP address'
      });
    }
    
    next();
  };
};

// Request logging for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString()
    };
    
    // Log suspicious activities
    if (res.statusCode >= 400 || duration > 5000) {
      logger.warn('Suspicious request detected:', logData);
    }
  });
  
  next();
};

// File type validation for uploads
export const validateFileType = (allowedTypes: string[] = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next();
    }
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      logger.warn(`Invalid file type uploaded: ${req.file.mimetype} from IP: ${req.ip}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only CSV and Excel files are allowed.'
      });
    }
    
    // Check file size (10MB limit)
    if (req.file.size > 10 * 1024 * 1024) {
      logger.warn(`File too large uploaded: ${req.file.size} bytes from IP: ${req.ip}`);
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB.'
      });
    }
    
    next();
  };
};