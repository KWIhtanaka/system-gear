import cron from 'node-cron';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import logger from './config/logger';
import pool from './config/database';
import { DataImportJob } from './jobs/DataImportJob';
import { StockUpdateJob } from './jobs/StockUpdateJob';

dotenv.config();

const logDir = process.env.LOG_DIR || './logs';
const inputDir = process.env.INPUT_DIR || './input';
const processedDir = process.env.PROCESSED_DIR || './processed';
const errorDir = process.env.ERROR_DIR || './error';

async function initializeDirectories() {
  await Promise.all([
    fs.ensureDir(logDir),
    fs.ensureDir(inputDir),
    fs.ensureDir(processedDir),
    fs.ensureDir(errorDir)
  ]);
}

async function startBatchProcessing() {
  try {
    await initializeDirectories();
    logger.info('System Gear Batch Processing System started');

    const dataImportJob = new DataImportJob();
    const stockUpdateJob = new StockUpdateJob();

    const stockUpdateCron = process.env.STOCK_UPDATE_CRON || '0 */30 * * * *';
    const dataImportCron = process.env.DATA_IMPORT_CRON || '0 0 */6 * * *';

    cron.schedule(stockUpdateCron, async () => {
      logger.info('Starting scheduled stock update job');
      try {
        await stockUpdateJob.execute();
      } catch (error) {
        logger.error('Stock update job failed:', error);
      }
    });

    cron.schedule(dataImportCron, async () => {
      logger.info('Starting scheduled data import job');
      try {
        await dataImportJob.execute();
      } catch (error) {
        logger.error('Data import job failed:', error);
      }
    });

    logger.info(`Stock update job scheduled: ${stockUpdateCron}`);
    logger.info(`Data import job scheduled: ${dataImportCron}`);

    await dataImportJob.execute();

  } catch (error) {
    logger.error('Failed to start batch processing system:', error);
    process.exit(1);
  }
}

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down batch system...`);
  pool.end(() => {
    logger.info('Database pool closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startBatchProcessing();