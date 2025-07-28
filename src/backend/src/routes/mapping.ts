import { Router } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest, validateQuery, schemas } from '../middleware/validation';
import { MappingRule, ApiResponse } from '../types';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { supplier } = req.query;

    let query = `
      SELECT id, supplier, file_field, db_field, type, condition, fixed_value, priority, created_at, updated_at
      FROM mapping_rules
    `;
    const queryParams: any[] = [];

    if (supplier) {
      query += ' WHERE supplier = $1';
      queryParams.push(supplier);
    }

    query += ' ORDER BY supplier, priority ASC, id ASC';

    const result = await pool.query(query, queryParams);

    const response: ApiResponse<MappingRule[]> = {
      success: true,
      data: result.rows
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

router.get('/suppliers', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT supplier, COUNT(*) as rule_count
      FROM mapping_rules
      GROUP BY supplier
      ORDER BY supplier
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Suppliers list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suppliers'
    });
  }
});

router.post('/', 
  authenticateToken, 
  requireRole(['admin']),
  validateRequest(schemas.mappingRule), 
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { supplier, rules } = req.body;

      await client.query('DELETE FROM mapping_rules WHERE supplier = $1', [supplier]);

      const insertPromises = rules.map((rule: any, index: number) => {
        return client.query(
          `INSERT INTO mapping_rules 
           (supplier, file_field, db_field, type, condition, fixed_value, priority) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            supplier,
            rule.file_field,
            rule.db_field,
            rule.type || null,
            rule.condition || null,
            rule.fixed_value || null,
            rule.priority || index + 1
          ]
        );
      });

      await Promise.all(insertPromises);

      await client.query('COMMIT');

      logger.info(`Mapping rules updated for supplier: ${supplier}, rules count: ${rules.length}`);

      res.json({
        success: true,
        message: `Mapping rules updated successfully for ${supplier}`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Mapping rules update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update mapping rules'
      });
    } finally {
      client.release();
    }
  }
);

router.put('/:id', 
  authenticateToken, 
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { file_field, db_field, type, condition, fixed_value, priority } = req.body;

      const result = await pool.query(
        `UPDATE mapping_rules 
         SET file_field = $1, db_field = $2, type = $3, condition = $4, 
             fixed_value = $5, priority = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [file_field, db_field, type, condition, fixed_value, priority, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Mapping rule not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Mapping rule update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update mapping rule'
      });
    }
  }
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM mapping_rules WHERE id = $1 RETURNING supplier',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Mapping rule not found'
        });
      }

      logger.info(`Mapping rule deleted: ${id} for supplier: ${result.rows[0].supplier}`);

      res.json({
        success: true,
        message: 'Mapping rule deleted successfully'
      });

    } catch (error) {
      logger.error('Mapping rule delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete mapping rule'
      });
    }
  }
);

router.post('/test', 
  authenticateToken, 
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { supplier, sample_data } = req.body;

      if (!supplier || !sample_data) {
        return res.status(400).json({
          success: false,
          error: 'Supplier and sample_data are required'
        });
      }

      const mappingRules = await pool.query(
        'SELECT * FROM mapping_rules WHERE supplier = $1 ORDER BY priority ASC',
        [supplier]
      );

      if (mappingRules.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No mapping rules found for supplier'
        });
      }

      const mappedData: any = {};
      const warnings: string[] = [];

      for (const rule of mappingRules.rows) {
        let value = sample_data[rule.file_field];

        if (rule.fixed_value && rule.fixed_value.trim() !== '') {
          value = rule.fixed_value;
        }

        if (value !== undefined && value !== null) {
          try {
            switch (rule.type?.toLowerCase()) {
              case 'integer':
              case 'int':
                value = parseInt(String(value));
                if (isNaN(value)) {
                  warnings.push(`Invalid integer value for ${rule.db_field}`);
                }
                break;
              case 'decimal':
              case 'float':
                value = parseFloat(String(value));
                if (isNaN(value)) {
                  warnings.push(`Invalid decimal value for ${rule.db_field}`);
                }
                break;
              case 'string':
                value = String(value);
                break;
              case 'date':
                value = new Date(value);
                if (isNaN(value.getTime())) {
                  warnings.push(`Invalid date value for ${rule.db_field}`);
                }
                break;
            }
            mappedData[rule.db_field] = value;
          } catch (error) {
            warnings.push(`Type conversion error for ${rule.db_field}: ${error}`);
          }
        } else if (!rule.fixed_value) {
          warnings.push(`Missing value for ${rule.file_field} -> ${rule.db_field}`);
        }
      }

      res.json({
        success: true,
        data: {
          mapped_data: mappedData,
          warnings,
          mapping_rules_applied: mappingRules.rows.length
        }
      });

    } catch (error) {
      logger.error('Mapping test error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test mapping'
      });
    }
  }
);

router.get('/export/:supplier', 
  authenticateToken, 
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { supplier } = req.params;

      const result = await pool.query(
        'SELECT supplier, file_field, db_field, type, condition, fixed_value, priority FROM mapping_rules WHERE supplier = $1 ORDER BY priority ASC',
        [supplier]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No mapping rules found for supplier'
        });
      }

      const csvHeader = 'supplier,file_field,db_field,type,condition,fixed_value,priority';
      const csvRows = result.rows.map(row => 
        [
          row.supplier,
          row.file_field,
          row.db_field,
          row.type || '',
          row.condition || '',
          row.fixed_value || '',
          row.priority
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
      );

      const csv = [csvHeader, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="mapping_rules_${supplier}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\uFEFF' + csv);

    } catch (error) {
      logger.error('Mapping rules export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export mapping rules'
      });
    }
  }
);

export default router;