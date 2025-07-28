import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types';
import logger from '../config/logger';

export interface AuthRequest extends Request {
  user?: User;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token is required' 
    });
  }

  try {
    // 開発用モックトークンの処理
    if (token === 'mock-jwt-token-for-demo') {
      req.user = {
        id: 1,
        username: 'admin',
        email: 'admin@systemgear.com',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      };
      return next();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, secret) as any;
    req.user = decoded.user;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
};