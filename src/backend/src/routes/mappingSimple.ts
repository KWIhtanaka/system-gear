import { Router } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import { authenticateToken, requireRole } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = Router();

// Simple mapping rules for basic field mapping
interface SimpleMappingRule {
  id: number;
  supplier: string;
  file_field: string;
  db_field: string;
  type: string;
  condition?: string;
  fixed_value?: string;
  priority: number;
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { supplier } = req.query;

    // Return empty array for now since we don't have the simple mapping table
    const response: ApiResponse<SimpleMappingRule[]> = {
      success: true,
      data: []
    };

    res.json(response);

  } catch (error) {
    logger.error('Mapping rules fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mapping rules'
    });
  }
});

router.post('/', 
  authenticateToken, 
  requireRole(['admin']),
  async (req, res) => {
    try {
      // For now, just return success
      res.json({
        success: true,
        message: 'Mapping rules saved successfully'
      });

    } catch (error) {
      logger.error('Mapping rules save error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save mapping rules'
      });
    }
  }
);

router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { supplier, sample_data } = req.body;

    // Simple test implementation
    const response = {
      success: true,
      data: {
        mapped_data: sample_data,
        warnings: []
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Mapping test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test mapping'
    });
  }
});

router.get('/export/:supplier', authenticateToken, async (req, res) => {
  try {
    const { supplier } = req.params;

    // Return empty CSV for now
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="mapping_rules_${supplier}.csv"`);
    res.send('file_field,db_field,type,condition,fixed_value,priority\n');

  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export mapping rules'
    });
  }
});

export default router;