import pool from '../config/database';
import logger from '../config/logger';
import { BatchJobResult, BatchError } from '../types';

export class StockUpdateJob {
  async execute(): Promise<BatchJobResult> {
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalErrors = 0;
    const allErrors: BatchError[] = [];

    try {
      logger.info('Starting stock update job');

      const stockResult = await this.processStockData();
      const priceResult = await this.processPriceData();

      totalProcessed = stockResult.processed_count + priceResult.processed_count;
      totalErrors = stockResult.error_count + priceResult.error_count;
      allErrors.push(...stockResult.errors, ...priceResult.errors);

      const duration = Date.now() - startTime;
      logger.info(`Stock update job completed in ${duration}ms. Processed: ${totalProcessed}, Errors: ${totalErrors}`);

      return {
        success: totalErrors === 0,
        processed_count: totalProcessed,
        error_count: totalErrors,
        errors: allErrors,
        duration_ms: duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Stock update job failed:', error);

      return {
        success: false,
        processed_count: totalProcessed,
        error_count: totalErrors + 1,
        errors: [...allErrors, { error_message: String(error) }],
        duration_ms: duration
      };
    }
  }

  private async processStockData(): Promise<BatchJobResult> {
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    const errors: BatchError[] = [];

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const pendingStockData = await client.query(`
        SELECT cz.*, sp.item_id
        FROM chukan_file_zaiko cz
        LEFT JOIN supplier_part sp ON cz.supplier_id = sp.supplier_id 
          AND cz.supplier_part_no = sp.supplier_part_no
        WHERE NOT EXISTS (
          SELECT 1 FROM supplier_stock ss 
          WHERE ss.supplier_id = cz.supplier_id 
            AND ss.import_no = cz.import_no
        )
        ORDER BY cz.import_no, cz.supplier_id, cz.supplier_part_no
      `);

      logger.info(`Processing ${pendingStockData.rows.length} stock records`);

      for (const row of pendingStockData.rows) {
        try {
          await this.upsertSupplierPart(client, row);

          if (row.item_id) {
            await this.upsertSupplierStock(client, row);
            await this.updateItemStock(client, row);
          } else {
            logger.warn(`Skipping stock update for ${row.supplier_id}:${row.supplier_part_no} - no item_id mapping`);
          }

          processedCount++;

        } catch (error) {
          logger.error(`Error processing stock record ${row.supplier_id}:${row.supplier_part_no}:`, error);
          errors.push({
            error_message: `Stock processing error: ${error}`,
            raw_data: row
          });
          errorCount++;
        }
      }

      await this.cleanupOldStockData(client);

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      success: errorCount === 0,
      processed_count: processedCount,
      error_count: errorCount,
      errors,
      duration_ms: Date.now() - startTime
    };
  }

  private async processPriceData(): Promise<BatchJobResult> {
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    const errors: BatchError[] = [];

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const pendingPriceData = await client.query(`
        SELECT ct.*, sp.item_id
        FROM chukan_file_tanka ct
        LEFT JOIN supplier_part sp ON ct.supplier_id = sp.supplier_id 
          AND ct.supplier_part_no = sp.supplier_part_no
        WHERE NOT EXISTS (
          SELECT 1 FROM supplier_price sp2 
          WHERE sp2.supplier_id = ct.supplier_id 
            AND sp2.import_no = ct.import_no
        )
        ORDER BY ct.import_no, ct.supplier_id, ct.supplier_part_no
      `);

      logger.info(`Processing ${pendingPriceData.rows.length} price records`);

      for (const row of pendingPriceData.rows) {
        try {
          await this.upsertSupplierPart(client, row);

          if (row.item_id) {
            await this.upsertSupplierPrice(client, row);
            await this.updateItemPrice(client, row);
          } else {
            logger.warn(`Skipping price update for ${row.supplier_id}:${row.supplier_part_no} - no item_id mapping`);
          }

          processedCount++;

        } catch (error) {
          logger.error(`Error processing price record ${row.supplier_id}:${row.supplier_part_no}:`, error);
          errors.push({
            error_message: `Price processing error: ${error}`,
            raw_data: row
          });
          errorCount++;
        }
      }

      await this.cleanupOldPriceData(client);

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      success: errorCount === 0,
      processed_count: processedCount,
      error_count: errorCount,
      errors,
      duration_ms: Date.now() - startTime
    };
  }

  private async upsertSupplierPart(client: any, data: any) {
    await client.query(`
      INSERT INTO supplier_part 
      (supplier_id, supplier_maker, supplier_part_no, moq, spq, lead_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (supplier_id, supplier_part_no)
      DO UPDATE SET 
        supplier_maker = COALESCE($2, supplier_part.supplier_maker),
        moq = COALESCE($4, supplier_part.moq),
        spq = COALESCE($5, supplier_part.spq),
        lead_time = COALESCE($6, supplier_part.lead_time),
        updated_at = CURRENT_TIMESTAMP
    `, [
      data.supplier_id,
      data.supplier_maker,
      data.supplier_part_no,
      data.moq,
      data.spq,
      data.lead_time
    ]);
  }

  private async upsertSupplierStock(client: any, data: any) {
    await client.query(`
      DELETE FROM supplier_stock 
      WHERE supplier_id = $1 AND item_id = $2
    `, [data.supplier_id, data.item_id]);

    await client.query(`
      INSERT INTO supplier_stock 
      (supplier_id, item_id, stock, import_no)
      VALUES ($1, $2, $3, $4)
    `, [
      data.supplier_id,
      data.item_id,
      data.stock,
      data.import_no
    ]);
  }

  private async upsertSupplierPrice(client: any, data: any) {
    await client.query(`
      DELETE FROM supplier_price 
      WHERE supplier_id = $1 AND item_id = $2
    `, [data.supplier_id, data.item_id]);

    await client.query(`
      INSERT INTO supplier_price 
      (supplier_id, item_id, quantity, price, currency, import_no)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      data.supplier_id,
      data.item_id,
      data.quantity,
      data.price,
      data.currency,
      data.import_no
    ]);
  }

  private async updateItemStock(client: any, data: any) {
    await client.query(`
      UPDATE item 
      SET supplier_stock = $1, 
          supplier_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE item_id = $3
    `, [data.stock, data.supplier_id, data.item_id]);
  }

  private async updateItemPrice(client: any, data: any) {
    if (data.price && data.price > 0) {
      await client.query(`
        UPDATE item 
        SET cost_price = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE item_id = $2
      `, [data.price, data.item_id]);
    }
  }

  private async cleanupOldStockData(client: any) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const result = await client.query(`
      DELETE FROM supplier_stock 
      WHERE created_at < $1
    `, [cutoffDate]);

    logger.info(`Cleaned up ${result.rowCount} old stock records`);
  }

  private async cleanupOldPriceData(client: any) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const result = await client.query(`
      DELETE FROM supplier_price 
      WHERE created_at < $1
    `, [cutoffDate]);

    logger.info(`Cleaned up ${result.rowCount} old price records`);
  }
}