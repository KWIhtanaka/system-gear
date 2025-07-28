import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { 
  generalRateLimit, 
  progressiveSlowDown, 
  sanitizeInput, 
  securityHeaders, 
  securityLogger 
} from './middleware/security';

import logger from './config/logger';
import pool from './config/database';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import mappingRoutes from './routes/mapping';
import advancedMappingRoutes from './routes/advancedMapping';
import importRoutes from './routes/import';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(securityHeaders);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://frontend-production-730e.up.railway.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(compression()); // gzip compression for better performance
app.use(generalRateLimit);
app.use(progressiveSlowDown);
app.use(sanitizeInput);
app.use(securityLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

const uploadsDir = process.env.UPLOAD_DIR || './uploads';
const logsDir = process.env.LOG_DIR || './logs';

[uploadsDir, logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/mapping-rules', mappingRoutes);
app.use('/api/advanced-mapping', advancedMappingRoutes);
app.use('/api/external-stock', importRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    pool.end(() => {
      logger.info('Database pool closed.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;