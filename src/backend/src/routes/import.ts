import { Router } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import { authenticateToken, requireRole } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { uploadRateLimit, validateFileType } from '../middleware/security';
import { ImportManagement, ErrorLog, ApiResponse, PaginatedResponse } from '../types';

const router = Router();

router.post('/import', 
  uploadRateLimit,
  authenticateToken,
  requireRole(['admin']),
  uploadSingle,
  validateFileType(),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'File is required'
        });
      }

      const { supplier } = req.body;
      if (!supplier) {
        return res.status(400).json({
          success: false,
          error: 'Supplier is required'
        });
      }

      await client.query('BEGIN');

      const fileType = req.file.originalname.toLowerCase().includes('stock') || 
                      req.file.originalname.toLowerCase().includes('zaiko') ? 'stock' : 'price';

      const importResult = await client.query(
        `INSERT INTO import_management 
         (supplier_id, file_name, file_type, status) 
         VALUES ($1, $2, $3, 'uploaded') 
         RETURNING import_no`,
        [supplier, req.file.originalname, fileType]
      );

      const importNo = importResult.rows[0].import_no;

      await client.query('COMMIT');

      logger.info(`File uploaded for import: ${req.file.originalname}, import_no: ${importNo}`);

      res.json({
        success: true,
        data: {
          import_no: importNo,
          file_name: req.file.originalname,
          supplier,
          file_type: fileType,
          message: 'File uploaded successfully. Processing will begin shortly.'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('File upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file'
      });
    } finally {
      client.release();
    }
  }
);

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const {
      supplier,
      status,
      page = 1,
      size = 20
    } = req.query;

    const offset = (Number(page) - 1) * Number(size);
    const limit = Number(size);

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (supplier) {
      whereClause += ` AND supplier_id = $${paramIndex}`;
      queryParams.push(supplier);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM import_management
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT 
        import_no,
        supplier_id as supplier,
        file_name,
        file_type,
        processed_count as total_rows,
        processed_count - error_count as success_rows,
        error_count as error_rows,
        status,
        created_at,
        created_at as completed_at
      FROM import_management
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await pool.query(dataQuery, queryParams);

    const response: PaginatedResponse<ImportManagement[]> = {
      success: true,
      data: dataResult.rows,
      total,
      page: Number(page),
      size: Number(size)
    };

    res.json(response);

  } catch (error) {
    logger.error('Import history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch import history'
    });
  }
});

router.get('/history/:import_no', authenticateToken, async (req, res) => {
  try {
    const { import_no } = req.params;

    const result = await pool.query(
      'SELECT * FROM import_management WHERE import_no = $1',
      [import_no]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Import record not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Import detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch import details'
    });
  }
});

router.get('/errors', authenticateToken, async (req, res) => {
  try {
    const {
      import_no,
      page = 1,
      size = 50
    } = req.query;

    if (!import_no) {
      return res.status(400).json({
        success: false,
        error: 'import_no is required'
      });
    }

    const offset = (Number(page) - 1) * Number(size);
    const limit = Number(size);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM error_logs
      WHERE import_no = $1
    `;

    const countResult = await pool.query(countQuery, [import_no]);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT 
        id,
        import_no,
        row_no,
        field,
        error_message,
        created_at
      FROM error_logs
      WHERE import_no = $1
      ORDER BY row_no ASC, id ASC
      LIMIT $2 OFFSET $3
    `;

    const dataResult = await pool.query(dataQuery, [import_no, limit, offset]);

    const response: PaginatedResponse<ErrorLog[]> = {
      success: true,
      data: dataResult.rows,
      total,
      page: Number(page),
      size: Number(size)
    };

    res.json(response);

  } catch (error) {
    logger.error('Import errors fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch import errors'
    });
  }
});

router.post('/retry/:import_no', 
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { import_no } = req.params;

      const importCheck = await client.query(
        'SELECT * FROM import_management WHERE import_no = $1',
        [import_no]
      );

      if (importCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Import record not found'
        });
      }

      const importRecord = importCheck.rows[0];

      if (importRecord.status === 'processing') {
        return res.status(400).json({
          success: false,
          error: 'Import is already in progress'
        });
      }

      await client.query(
        `UPDATE import_management 
         SET status = 'processing', 
             processed_count = NULL, 
             error_count = NULL 
         WHERE import_no = $1`,
        [import_no]
      );

      await client.query(
        'DELETE FROM error_logs WHERE import_no = $1',
        [import_no]
      );

      if (importRecord.file_type === 'stock') {
        await client.query(
          'DELETE FROM chukan_file_zaiko WHERE import_no = $1',
          [import_no]
        );
      } else {
        await client.query(
          'DELETE FROM chukan_file_tanka WHERE import_no = $1',
          [import_no]
        );
      }

      await client.query('COMMIT');

      logger.info(`Import retry initiated for import_no: ${import_no}`);

      res.json({
        success: true,
        message: 'Import retry initiated successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Import retry error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry import'
      });
    } finally {
      client.release();
    }
  }
);

router.delete('/:import_no', 
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { import_no } = req.params;

      const importCheck = await client.query(
        'SELECT * FROM import_management WHERE import_no = $1',
        [import_no]
      );

      if (importCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Import record not found'
        });
      }

      const importRecord = importCheck.rows[0];

      if (importRecord.status === 'processing') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete import that is currently processing'
        });
      }

      await client.query('DELETE FROM error_logs WHERE import_no = $1', [import_no]);

      if (importRecord.file_type === 'stock') {
        await client.query('DELETE FROM chukan_file_zaiko WHERE import_no = $1', [import_no]);
        await client.query('DELETE FROM supplier_stock WHERE import_no = $1', [import_no]);
      } else {
        await client.query('DELETE FROM chukan_file_tanka WHERE import_no = $1', [import_no]);
        await client.query('DELETE FROM supplier_price WHERE import_no = $1', [import_no]);
      }

      await client.query('DELETE FROM import_management WHERE import_no = $1', [import_no]);

      await client.query('COMMIT');

      logger.info(`Import record deleted: ${import_no}`);

      res.json({
        success: true,
        message: 'Import record deleted successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Import delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete import record'
      });
    } finally {
      client.release();
    }
  }
);

router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const { supplier, days = 30 } = req.query;

    let whereClause = 'WHERE created_at >= CURRENT_DATE - INTERVAL \'' + days + ' days\'';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (supplier) {
      whereClause += ` AND supplier_id = $${paramIndex}`;
      queryParams.push(supplier);
      paramIndex++;
    }

    const query = `
      SELECT 
        COUNT(*) as total_imports,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_imports,
        COUNT(CASE WHEN status = 'completed_with_errors' THEN 1 END) as completed_with_errors,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_imports,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_imports,
        COALESCE(SUM(processed_count), 0) as total_rows_processed,
        COALESCE(SUM(processed_count - error_count), 0) as total_success_rows,
        COALESCE(SUM(error_count), 0) as total_error_rows,
        supplier_id as supplier
      FROM import_management
      ${whereClause}
      GROUP BY supplier_id
      ORDER BY supplier_id
    `;

    const result = await pool.query(query, queryParams);

    const totalQuery = `
      SELECT 
        COUNT(*) as total_imports,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_imports,
        COUNT(CASE WHEN status = 'completed_with_errors' THEN 1 END) as completed_with_errors,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_imports,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_imports,
        COALESCE(SUM(processed_count), 0) as total_rows_processed,
        COALESCE(SUM(processed_count - error_count), 0) as total_success_rows,
        COALESCE(SUM(error_count), 0) as total_error_rows
      FROM import_management
      ${whereClause}
    `;

    const totalResult = await pool.query(totalQuery, queryParams);

    res.json({
      success: true,
      data: {
        by_supplier: result.rows,
        total: totalResult.rows[0]
      }
    });

  } catch (error) {
    logger.error('Import statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch import statistics'
    });
  }
});

export default router;