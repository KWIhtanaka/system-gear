import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import logger from '../config/logger';
import { validateRequest, schemas } from '../middleware/validation';
import { authRateLimit } from '../middleware/security';
import { User } from '../types';

const router = Router();

router.post('/login', authRateLimit, validateRequest(schemas.login), async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0] as User & { password_hash: string };
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign(
      { 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
    );

    logger.info(`User ${user.username} logged in successfully`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;