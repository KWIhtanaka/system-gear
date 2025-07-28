import pool from '../config/database';
import logger from '../config/logger';
import { FileProcessor } from '../services/FileProcessor';
import { MappingService } from '../services/MappingService';
import { AdvancedMappingService } from '../services/AdvancedMappingService';
import { BatchJobResult, BatchError, SupplierData } from '../types';

export class DataImportJob {
  private fileProcessor: FileProcessor;
  private mappingService: MappingService;
  private advancedMappingService: AdvancedMappingService;

  constructor() {
    this.fileProcessor = new FileProcessor();
    this.mappingService = new MappingService();
    this.advancedMappingService = new AdvancedMappingService();
  }

  async execute(): Promise<BatchJobResult> {
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalErrors = 0;
    const allErrors: BatchError[] = [];

    try {
      logger.info('Starting data import job');

      const inputFiles = await this.fileProcessor.getInputFiles();
      logger.info(`Found ${inputFiles.length} files to process`);

      for (const filePath of inputFiles) {
        try {
          const result = await this.processFile(filePath);
          totalProcessed += result.processed_rows;
          totalErrors += result.error_rows;
          allErrors.push(...result.errors);

          if (result.success) {
            await this.fileProcessor.moveFileToProcessed(filePath);
          } else {
            await this.fileProcessor.moveFileToError(filePath, 
              result.errors.map(e => e.error_message).join('\n'));
          }

        } catch (error) {
          logger.error(`Failed to process file ${filePath}:`, error);
          allErrors.push({
            error_message: `File processing failed: ${error}`,
            raw_data: { filePath }
          });
          totalErrors++;

          await this.fileProcessor.moveFileToError(filePath, String(error));
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`Data import job completed in ${duration}ms. Processed: ${totalProcessed}, Errors: ${totalErrors}`);

      return {
        success: totalErrors === 0,
        processed_count: totalProcessed,
        error_count: totalErrors,
        errors: allErrors,
        duration_ms: duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Data import job failed:', error);

      return {
        success: false,
        processed_count: totalProcessed,
        error_count: totalErrors + 1,
        errors: [...allErrors, { error_message: String(error) }],
        duration_ms: duration
      };
    }
  }

  private async processFile(filePath: string) {
    logger.info(`Processing file: ${filePath}`);

    const supplier = this.extractSupplierFromFileName(filePath);
    const fileType = this.extractFileTypeFromFileName(filePath);
    
    const client = await pool.connect();
    let importNo: number;

    try {
      await client.query('BEGIN');

      const importResult = await client.query(
        'INSERT INTO import_management (supplier, file_name, file_type, status) VALUES ($1, $2, $3, $4) RETURNING import_no',
        [supplier, filePath.split('/').pop(), fileType, 'processing']
      );
      importNo = importResult.rows[0].import_no;

      const rawData = await this.fileProcessor.processFile(filePath);
      const mappingRules = await this.mappingService.getMappingRules(supplier);

      let processedRows = 0;
      let errorRows = 0;
      const errors: BatchError[] = [];

      for (const [index, row] of rawData.entries()) {
        try {
          // 基本マッピング適用
          let mappedData = this.mappingService.applyMapping(row, mappingRules);
          
          // 高度なマッピングルール適用
          const advancedResult = await this.advancedMappingService.applyAdvancedRules(supplier, mappedData);
          
          // スキップ条件チェック
          if (advancedResult.shouldSkip) {
            logger.debug(`Row ${index + 1} skipped by advanced mapping rules`);
            continue;
          }
          
          // 高度なマッピングエラーがある場合はログに記録
          if (advancedResult.errors.length > 0) {
            errors.push({
              row_no: row._rowNumber || index + 1,
              error_message: `Advanced mapping errors: ${advancedResult.errors.join(', ')}`,
              raw_data: row
            });
          }
          
          // 変換後のデータを使用
          mappedData = advancedResult.data;
          
          const validation = this.mappingService.validateMappedData(mappedData);

          if (!validation.isValid) {
            errors.push({
              row_no: row._rowNumber || index + 1,
              error_message: validation.errors.join(', '),
              raw_data: row
            });
            errorRows++;
            continue;
          }

          if (fileType === 'stock') {
            await this.insertStockData(client, importNo, mappedData);
          } else if (fileType === 'price') {
            await this.insertPriceData(client, importNo, mappedData);
          }

          processedRows++;

        } catch (error) {
          logger.error(`Row processing error at index ${index}:`, error);
          errors.push({
            row_no: row._rowNumber || index + 1,
            error_message: String(error),
            raw_data: row
          });
          errorRows++;
        }
      }

      await this.logErrors(client, importNo, errors);

      await client.query(
        'UPDATE import_management SET total_rows = $1, success_rows = $2, error_rows = $3, status = $4, completed_at = CURRENT_TIMESTAMP WHERE import_no = $5',
        [rawData.length, processedRows, errorRows, errorRows === 0 ? 'completed' : 'completed_with_errors', importNo]
      );

      await client.query('COMMIT');

      return {
        success: errorRows === 0,
        total_rows: rawData.length,
        processed_rows: processedRows,
        error_rows: errorRows,
        errors,
        import_no: importNo
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertStockData(client: any, importNo: number, data: SupplierData) {
    await client.query(
      `INSERT INTO chukan_file_zaiko 
       (import_no, import_date, supplier_id, supplier_maker, supplier_part_no, moq, spq, stock) 
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (import_no, supplier_id, supplier_part_no) 
       DO UPDATE SET supplier_maker = $3, moq = $5, spq = $6, stock = $7`,
      [importNo, data.supplier_id, data.supplier_maker, data.supplier_part_no, 
       data.moq, data.spq, data.stock]
    );
  }

  private async insertPriceData(client: any, importNo: number, data: SupplierData) {
    await client.query(
      `INSERT INTO chukan_file_tanka 
       (import_no, import_date, supplier_id, supplier_maker, supplier_part_no, quantity, price, currency) 
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (import_no, supplier_id, supplier_part_no) 
       DO UPDATE SET supplier_maker = $3, quantity = $5, price = $6, currency = $7`,
      [importNo, data.supplier_id, data.supplier_maker, data.supplier_part_no, 
       data.quantity, data.price, data.currency]
    );
  }

  private async logErrors(client: any, importNo: number, errors: BatchError[]) {
    for (const error of errors) {
      await client.query(
        'INSERT INTO error_logs (import_no, row_no, field, error_message) VALUES ($1, $2, $3, $4)',
        [importNo, error.row_no, error.field, error.error_message]
      );
    }
  }

  private extractSupplierFromFileName(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    
    if (fileName.includes('supplier_a') || fileName.includes('supplierA')) {
      return 'supplier_a';
    } else if (fileName.includes('supplier_b') || fileName.includes('supplierB')) {
      return 'supplier_b';
    }
    
    const match = fileName.match(/([a-zA-Z_]+)/);
    return match ? match[1]! : 'unknown';
  }

  private extractFileTypeFromFileName(filePath: string): string {
    const fileName = filePath.split('/').pop()?.toLowerCase() || '';
    
    if (fileName.includes('stock') || fileName.includes('zaiko')) {
      return 'stock';
    } else if (fileName.includes('price') || fileName.includes('tanka')) {
      return 'price';
    }
    
    return 'unknown';
  }
}