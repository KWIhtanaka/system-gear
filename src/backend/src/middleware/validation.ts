import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../config/logger';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      logger.warn('Validation error:', error.details);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      logger.warn('Query validation error:', error.details);
      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};

export const schemas = {
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  mappingRule: Joi.object({
    supplier: Joi.string().required(),
    rules: Joi.array().items(
      Joi.object({
        file_field: Joi.string().required(),
        db_field: Joi.string().required(),
        type: Joi.string().optional(),
        condition: Joi.string().allow('').optional(),
        fixed_value: Joi.string().optional(),
        priority: Joi.number().integer().min(1).optional()
      })
    ).required()
  }),

  productSearch: Joi.object({
    name: Joi.string().optional(),
    model: Joi.string().optional(),
    supplier: Joi.string().optional(),
    page: Joi.number().integer().min(1).optional(),
    size: Joi.number().integer().min(1).max(100).optional()
  })
};