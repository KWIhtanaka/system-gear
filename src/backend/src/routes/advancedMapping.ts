import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AdvancedMappingService } from '../services/AdvancedMappingService';
import logger from '../config/logger';
import { validateRequest as validateBody, validateQuery } from '../middleware/validation';
import Joi from 'joi';

const router = Router();
const advancedMappingService = new AdvancedMappingService();

// バリデーションスキーマ
const valueMapppingSchema = Joi.object({
  supplier: Joi.string().required(),
  rule_name: Joi.string().required(),
  source_field: Joi.string().required(),
  target_field: Joi.string().required(),
  mappings: Joi.array().items(
    Joi.object({
      from_value: Joi.string().required(),
      to_value: Joi.string().required(),
      match_type: Joi.string().valid('exact', 'contains', 'regex').default('exact')
    })
  ).required()
});

const conditionalSkipSchema = Joi.object({
  supplier: Joi.string().required(),
  rule_name: Joi.string().required(),
  conditions: Joi.array().items(
    Joi.object({
      field: Joi.string().required(),
      operator: Joi.string().valid('equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains').required(),
      value: Joi.string().required(),
      logic_operator: Joi.string().valid('AND', 'OR').optional()
    })
  ).required()
});

const calculationSchema = Joi.object({
  supplier: Joi.string().required(),
  rule_name: Joi.string().required(),
  source_field: Joi.string().required(),
  target_field: Joi.string().required(),
  formula: Joi.string().required(),
  variables: Joi.array().items(Joi.string()).required()
});

const textTransformSchema = Joi.object({
  supplier: Joi.string().required(),
  rule_name: Joi.string().required(),
  source_field: Joi.string().required(),
  target_field: Joi.string().required(),
  transform_type: Joi.string().valid('uppercase', 'lowercase', 'trim', 'replace', 'substring', 'custom').required(),
  parameters: Joi.object().optional()
});

// 高度なマッピングルール一覧取得
router.get('/', 
  authenticateToken,
  validateQuery(Joi.object({ supplier: Joi.string().required() })),
  async (req, res) => {
    try {
      const { supplier } = req.query as { supplier: string };
      const rules = await advancedMappingService.getAdvancedRules(supplier);
      
      res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      logger.error('Failed to get advanced mapping rules:', error);
      res.status(500).json({
        success: false,
        error: 'マッピングルールの取得に失敗しました'
      });
    }
  }
);

// 値マッピングルール作成
router.post('/value-mapping',
  authenticateToken,
  requireRole(['admin']),
  validateBody(valueMapppingSchema),
  async (req, res) => {
    try {
      const { supplier, rule_name, source_field, target_field, mappings } = req.body;
      
      const rule = await advancedMappingService.createValueMapping(
        supplier,
        source_field,
        target_field,
        mappings,
        rule_name
      );
      
      res.json({
        success: true,
        data: rule,
        message: '値マッピングルールを作成しました'
      });
    } catch (error) {
      logger.error('Failed to create value mapping rule:', error);
      res.status(500).json({
        success: false,
        error: '値マッピングルールの作成に失敗しました'
      });
    }
  }
);

// 条件スキップルール作成
router.post('/conditional-skip',
  authenticateToken,
  requireRole(['admin']),
  validateBody(conditionalSkipSchema),
  async (req, res) => {
    try {
      const { supplier, rule_name, conditions } = req.body;
      
      const rule = await advancedMappingService.createConditionalSkip(
        supplier,
        conditions,
        rule_name
      );
      
      res.json({
        success: true,
        data: rule,
        message: '条件スキップルールを作成しました'
      });
    } catch (error) {
      logger.error('Failed to create conditional skip rule:', error);
      res.status(500).json({
        success: false,
        error: '条件スキップルールの作成に失敗しました'
      });
    }
  }
);

// 計算ルール作成
router.post('/calculation',
  authenticateToken,
  requireRole(['admin']),
  validateBody(calculationSchema),
  async (req, res) => {
    try {
      const { supplier, rule_name, source_field, target_field, formula, variables } = req.body;
      
      const rule = await advancedMappingService.createCalculationRule(
        supplier,
        source_field,
        target_field,
        { formula, variables },
        rule_name
      );
      
      res.json({
        success: true,
        data: rule,
        message: '計算ルールを作成しました'
      });
    } catch (error) {
      logger.error('Failed to create calculation rule:', error);
      res.status(500).json({
        success: false,
        error: '計算ルールの作成に失敗しました'
      });
    }
  }
);

// テキスト変換ルール作成
router.post('/text-transform',
  authenticateToken,
  requireRole(['admin']),
  validateBody(textTransformSchema),
  async (req, res) => {
    try {
      const { supplier, rule_name, source_field, target_field, transform_type, parameters } = req.body;
      
      const rule = await advancedMappingService.createTextTransform(
        supplier,
        source_field,
        target_field,
        { transform_type, parameters },
        rule_name
      );
      
      res.json({
        success: true,
        data: rule,
        message: 'テキスト変換ルールを作成しました'
      });
    } catch (error) {
      logger.error('Failed to create text transform rule:', error);
      res.status(500).json({
        success: false,
        error: 'テキスト変換ルールの作成に失敗しました'
      });
    }
  }
);

// ルールテスト
router.post('/test',
  authenticateToken,
  validateBody(Joi.object({
    supplier: Joi.string().required(),
    sample_data: Joi.object().required()
  })),
  async (req, res) => {
    try {
      const { supplier, sample_data } = req.body;
      
      const result = await advancedMappingService.applyAdvancedRules(supplier, sample_data);
      
      res.json({
        success: true,
        data: {
          original_data: sample_data,
          processed_data: result.data,
          should_skip: result.shouldSkip,
          errors: result.errors
        }
      });
    } catch (error) {
      logger.error('Failed to test advanced mapping rules:', error);
      res.status(500).json({
        success: false,
        error: 'マッピングルールのテストに失敗しました'
      });
    }
  }
);

// ルール削除
router.delete('/:id',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const ruleId = parseInt(req.params.id!);
      if (isNaN(ruleId)) {
        return res.status(400).json({
          success: false,
          error: '無効なルールIDです'
        });
      }
      await advancedMappingService.deleteRule(ruleId);
      
      res.json({
        success: true,
        message: 'ルールを削除しました'
      });
    } catch (error) {
      logger.error('Failed to delete advanced mapping rule:', error);
      res.status(500).json({
        success: false,
        error: 'ルールの削除に失敗しました'
      });
    }
  }
);

// ルール更新
router.put('/:id',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const ruleId = parseInt(req.params.id!);
      if (isNaN(ruleId)) {
        return res.status(400).json({
          success: false,
          error: '無効なルールIDです'
        });
      }
      const updates = req.body;
      
      const rule = await advancedMappingService.updateRule(ruleId, updates);
      
      res.json({
        success: true,
        data: rule,
        message: 'ルールを更新しました'
      });
    } catch (error) {
      logger.error('Failed to update advanced mapping rule:', error);
      res.status(500).json({
        success: false,
        error: 'ルールの更新に失敗しました'
      });
    }
  }
);

export default router;