import pool from '../config/database';
import logger from '../config/logger';

export interface ConditionRule {
  id?: number;
  rule_name: string;
  rule_type: 'value_mapping' | 'conditional_skip' | 'calculation' | 'text_transform';
  source_field: string;
  target_field: string;
  conditions: any[];
  priority: number;
  is_active: boolean;
}

export interface ValueMappingCondition {
  from_value: string;
  to_value: string;
  match_type: 'exact' | 'contains' | 'regex';
}

export interface ConditionalSkipCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: string;
  logic_operator?: 'AND' | 'OR';
}

export interface CalculationCondition {
  formula: string;
  variables: string[];
}

export interface TextTransformCondition {
  transform_type: 'uppercase' | 'lowercase' | 'trim' | 'replace' | 'substring' | 'custom';
  parameters: any;
}

export class AdvancedMappingService {
  
  // メーカー名統一マッピング
  async createValueMapping(
    supplier: string,
    sourceField: string,
    targetField: string,
    mappings: ValueMappingCondition[],
    ruleName: string
  ): Promise<ConditionRule> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO mapping_rules 
        (supplier_id, rule_name, conditions, mapping, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
          rule_id as id,
          supplier_id as supplier,
          rule_name,
          'value_mapping' as rule_type,
          $6 as source_field,
          $7 as target_field,
          conditions,
          1 as priority,
          is_active
      `, [
        supplier,
        ruleName,
        JSON.stringify({ source_field: sourceField, target_field: targetField }),
        JSON.stringify({ mappings }),
        true,
        sourceField,
        targetField
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // 条件スキップルール
  async createConditionalSkip(
    supplier: string,
    conditions: ConditionalSkipCondition[],
    ruleName: string
  ): Promise<ConditionRule> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO mapping_rules 
        (supplier_id, rule_name, conditions, mapping, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
          rule_id as id,
          supplier_id as supplier,
          rule_name,
          'conditional_skip' as rule_type,
          '' as source_field,
          '' as target_field,
          conditions,
          1 as priority,
          is_active
      `, [
        supplier,
        ruleName,
        JSON.stringify({ type: 'conditional_skip' }),
        JSON.stringify({ conditions }),
        true
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // 計算ルール
  async createCalculationRule(
    supplier: string,
    sourceField: string,
    targetField: string,
    calculation: CalculationCondition,
    ruleName: string
  ): Promise<ConditionRule> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO advanced_mapping_rules 
        (supplier, rule_name, rule_type, source_field, target_field, conditions, priority, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        supplier,
        ruleName,
        'calculation',
        sourceField,
        targetField,
        JSON.stringify([calculation]),
        1,
        true
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // テキスト変換ルール
  async createTextTransform(
    supplier: string,
    sourceField: string,
    targetField: string,
    transform: TextTransformCondition,
    ruleName: string
  ): Promise<ConditionRule> {
    const client = await pool.connect();
    
    try {
      const result = await pool.query(`
        INSERT INTO advanced_mapping_rules 
        (supplier, rule_name, rule_type, source_field, target_field, conditions, priority, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        supplier,
        ruleName,
        'text_transform',
        sourceField,
        targetField,
        JSON.stringify([transform]),
        1,
        true
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // 全ルール取得
  async getAdvancedRules(supplier: string): Promise<ConditionRule[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          rule_id as id,
          supplier_id as supplier,
          rule_name,
          CASE 
            WHEN conditions->>'source_field' IS NOT NULL THEN 'value_mapping'
            ELSE 'conditional_skip'
          END as rule_type,
          COALESCE(conditions->>'source_field', '') as source_field,
          COALESCE(conditions->>'target_field', '') as target_field,
          COALESCE(mapping->'mappings', '[]'::jsonb) as conditions,
          1 as priority,
          is_active
        FROM mapping_rules 
        WHERE supplier_id = $1 AND is_active = true
        ORDER BY created_at ASC
      `, [supplier]);
      
      return result.rows.map(row => ({
        ...row,
        conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions
      }));
    } finally {
      client.release();
    }
  }

  // ルール適用
  async applyAdvancedRules(supplier: string, rawData: any): Promise<{ data: any; shouldSkip: boolean; errors: string[] }> {
    const rules = await this.getAdvancedRules(supplier);
    let processedData = { ...rawData };
    let shouldSkip = false;
    const errors: string[] = [];

    for (const rule of rules) {
      try {
        switch (rule.rule_type) {
          case 'value_mapping':
            processedData = this.applyValueMapping(processedData, rule);
            break;
          case 'conditional_skip':
            if (this.checkSkipConditions(processedData, rule)) {
              shouldSkip = true;
              logger.debug(`Row skipped by rule: ${rule.rule_name}`);
            }
            break;
          case 'calculation':
            processedData = this.applyCalculation(processedData, rule);
            break;
          case 'text_transform':
            processedData = this.applyTextTransform(processedData, rule);
            break;
        }
      } catch (error) {
        errors.push(`Rule '${rule.rule_name}' failed: ${error}`);
        logger.error(`Advanced mapping rule error:`, error);
      }
    }

    return { data: processedData, shouldSkip, errors };
  }

  private applyValueMapping(data: any, rule: ConditionRule): any {
    const sourceValue = data[rule.source_field];
    if (!sourceValue) return data;

    const mappings = rule.conditions as ValueMappingCondition[];
    
    for (const mapping of mappings) {
      let isMatch = false;
      
      switch (mapping.match_type) {
        case 'exact':
          isMatch = sourceValue === mapping.from_value;
          break;
        case 'contains':
          isMatch = sourceValue.toString().toLowerCase().includes(mapping.from_value.toLowerCase());
          break;
        case 'regex':
          isMatch = new RegExp(mapping.from_value, 'i').test(sourceValue.toString());
          break;
      }
      
      if (isMatch) {
        data[rule.target_field] = mapping.to_value;
        break;
      }
    }
    
    return data;
  }

  private checkSkipConditions(data: any, rule: ConditionRule): boolean {
    const conditions = rule.conditions as ConditionalSkipCondition[];
    
    let result = true;
    let hasConditions = false;
    
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      if (!condition) continue;
      
      const fieldValue = data[condition.field];
      let conditionResult = false;
      
      switch (condition.operator) {
        case 'equals':
          conditionResult = fieldValue == condition.value;
          break;
        case 'not_equals':
          conditionResult = fieldValue != condition.value;
          break;
        case 'greater_than':
          conditionResult = parseFloat(fieldValue) > parseFloat(condition.value);
          break;
        case 'less_than':
          conditionResult = parseFloat(fieldValue) < parseFloat(condition.value);
          break;
        case 'contains':
          conditionResult = fieldValue?.toString().toLowerCase().includes(condition.value.toLowerCase());
          break;
        case 'not_contains':
          conditionResult = !fieldValue?.toString().toLowerCase().includes(condition.value.toLowerCase());
          break;
      }
      
      if (!hasConditions) {
        result = conditionResult;
        hasConditions = true;
      } else {
        const prevCondition = conditions[i-1];
        const logicOp = prevCondition?.logic_operator || 'AND';
        if (logicOp === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }
    }
    
    return result;
  }

  private applyCalculation(data: any, rule: ConditionRule): any {
    const calculation = rule.conditions[0] as CalculationCondition;
    let formula = calculation.formula;
    
    // 変数を実際の値に置換
    for (const variable of calculation.variables) {
      const value = data[variable] || 0;
      formula = formula.replace(new RegExp(`\\b${variable}\\b`, 'g'), value.toString());
    }
    
    try {
      // 安全な計算実行（eval の代替）
      const result = this.safeEvaluate(formula);
      data[rule.target_field] = result;
    } catch (error) {
      logger.error('Calculation error:', error);
      throw new Error(`Calculation failed: ${formula}`);
    }
    
    return data;
  }

  private applyTextTransform(data: any, rule: ConditionRule): any {
    const sourceValue = data[rule.source_field];
    if (!sourceValue) return data;

    const transform = rule.conditions[0] as TextTransformCondition;
    let result = sourceValue.toString();
    
    switch (transform.transform_type) {
      case 'uppercase':
        result = result.toUpperCase();
        break;
      case 'lowercase':
        result = result.toLowerCase();
        break;
      case 'trim':
        result = result.trim();
        break;
      case 'replace':
        result = result.replace(new RegExp(transform.parameters.from, 'g'), transform.parameters.to);
        break;
      case 'substring':
        result = result.substring(transform.parameters.start, transform.parameters.end);
        break;
      case 'custom':
        // カスタム変換ロジック
        result = this.applyCustomTransform(result, transform.parameters);
        break;
    }
    
    data[rule.target_field] = result;
    return data;
  }

  private safeEvaluate(formula: string): number {
    // 数学的演算のみを許可する安全な評価
    const allowedChars = /^[0-9+\-*/.() ]+$/;
    if (!allowedChars.test(formula)) {
      throw new Error('Invalid characters in formula');
    }
    
    try {
      return Function(`"use strict"; return (${formula})`)();
    } catch (error) {
      throw new Error('Formula evaluation failed');
    }
  }

  private applyCustomTransform(value: string, parameters: any): string {
    // カスタム変換の実装例
    if (parameters.type === 'normalize_part_number') {
      return value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    }
    return value;
  }

  // ルール削除
  async deleteRule(ruleId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('UPDATE advanced_mapping_rules SET is_active = false WHERE id = $1', [ruleId]);
    } finally {
      client.release();
    }
  }

  // ルール更新
  async updateRule(ruleId: number, updates: Partial<ConditionRule>): Promise<ConditionRule> {
    const client = await pool.connect();
    
    try {
      const setParts = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setParts.push(`${key} = $${paramIndex}`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }
      
      values.push(ruleId);
      
      const result = await client.query(`
        UPDATE advanced_mapping_rules 
        SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}