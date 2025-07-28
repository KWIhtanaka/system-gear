import { createClient } from 'redis';
import NodeCache from 'node-cache';
import logger from './logger';

// Redis Client (optional - fallback to in-memory cache if unavailable)
let redisClient: any = null;

// In-memory cache as fallback
const memoryCache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every minute
  maxKeys: 1000 // Maximum number of keys
});

// Initialize Redis connection
const initializeRedis = async () => {
  try {
    if (process.env.REDIS_URL) {
      redisClient = createClient({
        url: process.env.REDIS_URL
      });

      redisClient.on('error', (err: Error) => {
        logger.error('Redis Client Error:', err);
        redisClient = null; // Fallback to memory cache
      });

      redisClient.on('connect', () => {
        logger.info('Connected to Redis server');
      });

      await redisClient.connect();
    } else {
      logger.info('Redis URL not configured, using in-memory cache');
    }
  } catch (error) {
    logger.error('Failed to connect to Redis, using in-memory cache:', error);
    redisClient = null;
  }
};

// Cache operations
export class CacheService {
  static async get(key: string): Promise<any> {
    try {
      if (redisClient && redisClient.isOpen) {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return memoryCache.get(key) || null;
      }
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl: number = 300): Promise<boolean> {
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
        return true;
      } else {
        memoryCache.set(key, value, ttl);
        return true;
      }
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.del(key);
        return true;
      } else {
        memoryCache.del(key);
        return true;
      }
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  static async clear(): Promise<boolean> {
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.flushAll();
        return true;
      } else {
        memoryCache.flushAll();
        return true;
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }

  static async keys(pattern: string = '*'): Promise<string[]> {
    try {
      if (redisClient && redisClient.isOpen) {
        return await redisClient.keys(pattern);
      } else {
        return memoryCache.keys().filter(key => 
          pattern === '*' || key.includes(pattern.replace('*', ''))
        );
      }
    } catch (error) {
      logger.error('Cache keys error:', error);
      return [];
    }
  }
}

// Cache middleware for Express
export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: any, res: any, next: any) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cachedData = await CacheService.get(key);
      if (cachedData) {
        logger.debug(`Cache hit for: ${key}`);
        return res.json(cachedData);
      }
      
      // Store original res.json
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data: any) {
        if (res.statusCode === 200) {
          CacheService.set(key, data, ttl).catch(err => 
            logger.error('Failed to cache response:', err)
          );
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Initialize cache on startup
initializeRedis();

export default CacheService;