import { Router } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import { authenticateToken } from '../middleware/auth';
import { validateQuery, schemas } from '../middleware/validation';
import { cacheMiddleware } from '../config/cache';
import { ProductSearchParams, PaginatedResponse, Item } from '../types';

const router = Router();

router.get('/', 
  authenticateToken, 
  validateQuery(schemas.productSearch),
  cacheMiddleware(300), // Cache for 5 minutes
  async (req, res) => {
    try {
      const {
        name,
        model,
        supplier,
        page = 1,
        size = 20
      } = req.query as ProductSearchParams;

      const offset = (Number(page) - 1) * Number(size);
      const limit = Number(size);

      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (name) {
        whereClause += ` AND i.display_name ILIKE $${paramIndex}`;
        queryParams.push(`%${name}%`);
        paramIndex++;
      }

      if (model) {
        whereClause += ` AND i.model ILIKE $${paramIndex}`;
        queryParams.push(`%${model}%`);
        paramIndex++;
      }

      if (supplier) {
        whereClause += ` AND i.supplier_id = $${paramIndex}`;
        queryParams.push(supplier);
        paramIndex++;
      }

      const countQuery = `
        SELECT COUNT(*) as total
        FROM item i
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      const dataQuery = `
        SELECT 
          i.item_id,
          i.model,
          i.display_name as name,
          i.stock,
          i.sales_price as price,
          i.supplier_id as supplier,
          i.supplier_stock,
          i.moq,
          i.spq,
          i.lead_time,
          i.created_at,
          i.updated_at
        FROM item i
        ${whereClause}
        ORDER BY i.updated_at DESC, i.item_id ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const dataResult = await pool.query(dataQuery, queryParams);

      const response: PaginatedResponse<Item[]> = {
        success: true,
        data: dataResult.rows,
        total,
        page: Number(page),
        size: Number(size)
      };

      res.json(response);

    } catch (error) {
      logger.error('Product search error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search products'
      });
    }
  }
);

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        i.*,
        id_detail.description,
        id_detail.detail_url
      FROM item i
      LEFT JOIN item_detail id_detail ON i.item_id = id_detail.item_id 
        AND id_detail.language_id = 1
      WHERE i.item_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Product detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product details'
    });
  }
});

router.get('/:id/suppliers', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        sp.supplier_id,
        sp.supplier_maker,
        sp.supplier_part_no,
        sp.moq,
        sp.spq,
        sp.lead_time,
        ss.stock as supplier_stock,
        sp_price.price as supplier_price,
        sp_price.currency,
        sp_price.quantity as price_quantity
      FROM supplier_part sp
      LEFT JOIN supplier_stock ss ON sp.supplier_id = ss.supplier_id 
        AND sp.item_id = ss.item_id
      LEFT JOIN supplier_price sp_price ON sp.supplier_id = sp_price.supplier_id 
        AND sp.item_id = sp_price.item_id
      WHERE sp.item_id = $1
      ORDER BY sp.supplier_id
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Product suppliers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product suppliers'
    });
  }
});

router.get('/export/csv', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      model,
      supplier
    } = req.query as ProductSearchParams;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (name) {
      whereClause += ` AND i.display_name ILIKE $${paramIndex}`;
      queryParams.push(`%${name}%`);
      paramIndex++;
    }

    if (model) {
      whereClause += ` AND i.model ILIKE $${paramIndex}`;
      queryParams.push(`%${model}%`);
      paramIndex++;
    }

    if (supplier) {
      whereClause += ` AND i.supplier_id = $${paramIndex}`;
      queryParams.push(supplier);
      paramIndex++;
    }

    const query = `
      SELECT 
        i.item_id as "商品ID",
        i.model as "型番",
        i.display_name as "商品名",
        i.stock as "在庫",
        i.sales_price as "販売価格",
        i.cost_price as "仕入価格",
        i.supplier_id as "仕入先",
        i.supplier_stock as "仕入先在庫",
        i.moq as "最小発注数",
        i.spq as "最小パッケージ数",
        i.lead_time as "納期",
        i.updated_at as "更新日時"
      FROM item i
      ${whereClause}
      ORDER BY i.item_id
    `;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No products found for export'
      });
    }

    const csvHeader = Object.keys(result.rows[0]).join(',');
    const csvRows = result.rows.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    );

    const csv = [csvHeader, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="products_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv);

  } catch (error) {
    logger.error('Product CSV export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export products'
    });
  }
});

export default router;