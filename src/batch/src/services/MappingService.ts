import pool from '../config/database';
import logger from '../config/logger';
import { MappingRule, SupplierData } from '../types';

export class MappingService {
  async getMappingRules(supplier: string): Promise<MappingRule[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM mapping_rules WHERE supplier = $1 ORDER BY priority ASC',
        [supplier]
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get mapping rules:', error);
      throw error;
    }
  }

  applyMapping(rawData: any, mappingRules: MappingRule[]): SupplierData {
    const mappedData: SupplierData = {
      supplier_id: '',
      supplier_part_no: ''
    };

    for (const rule of mappingRules) {
      let value = rawData[rule.file_field];

      if (rule.fixed_value) {
        value = rule.fixed_value;
      }

      if (value !== undefined && value !== null) {
        value = this.convertType(value, rule.type);
        mappedData[rule.db_field as keyof SupplierData] = value;
      }
    }

    return mappedData;
  }

  private convertType(value: any, type?: string): any {
    if (!type) return value;

    try {
      switch (type.toLowerCase()) {
        case 'integer':
        case 'int':
          return parseInt(String(value));
        case 'decimal':
        case 'float':
          return parseFloat(String(value));
        case 'string':
          return String(value);
        case 'date':
          return new Date(value);
        default:
          return value;
      }
    } catch (error) {
      logger.warn(`Type conversion failed for value ${value} to ${type}:`, error);
      return value;
    }
  }

  validateMappedData(data: SupplierData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.supplier_id) {
      errors.push('supplier_id is required');
    }

    if (!data.supplier_part_no) {
      errors.push('supplier_part_no is required');
    }

    if (data.stock !== undefined && data.stock < 0) {
      errors.push('stock cannot be negative');
    }

    if (data.price !== undefined && data.price < 0) {
      errors.push('price cannot be negative');
    }

    if (data.moq !== undefined && data.moq < 0) {
      errors.push('moq cannot be negative');
    }

    if (data.spq !== undefined && data.spq < 0) {
      errors.push('spq cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}