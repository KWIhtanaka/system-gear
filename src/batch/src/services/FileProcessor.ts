import fs from 'fs-extra';
import path from 'path';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import logger from '../config/logger';
import { FileProcessingResult, BatchError } from '../types';

export class FileProcessor {
  private inputDir: string;
  private processedDir: string;
  private errorDir: string;

  constructor() {
    this.inputDir = process.env.INPUT_DIR || './input';
    this.processedDir = process.env.PROCESSED_DIR || './processed';
    this.errorDir = process.env.ERROR_DIR || './error';

    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    await Promise.all([
      fs.ensureDir(this.inputDir),
      fs.ensureDir(this.processedDir),
      fs.ensureDir(this.errorDir)
    ]);
  }

  async processCSVFile(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let rowNumber = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          rowNumber++;
          results.push({ ...data, _rowNumber: rowNumber });
        })
        .on('end', () => {
          logger.info(`CSV file processed: ${results.length} rows`);
          resolve(results);
        })
        .on('error', (error) => {
          logger.error('CSV processing error:', error);
          reject(error);
        });
    });
  }

  async processExcelFile(filePath: string): Promise<any[]> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]!;
      const worksheet = workbook.Sheets[sheetName]!;
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = data.map((row: any, index) => ({
        ...row,
        _rowNumber: index + 1
      }));

      logger.info(`Excel file processed: ${results.length} rows`);
      return results;
    } catch (error) {
      logger.error('Excel processing error:', error);
      throw error;
    }
  }

  async processFile(filePath: string): Promise<any[]> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.csv':
        return this.processCSVFile(filePath);
      case '.xlsx':
      case '.xls':
        return this.processExcelFile(filePath);
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  async moveFileToProcessed(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newFileName = `${timestamp}_${fileName}`;
    const newPath = path.join(this.processedDir, newFileName);

    await fs.move(filePath, newPath);
    logger.info(`File moved to processed: ${newPath}`);
  }

  async moveFileToError(filePath: string, error: string): Promise<void> {
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newFileName = `${timestamp}_${fileName}`;
    const newPath = path.join(this.errorDir, newFileName);

    await fs.move(filePath, newPath);
    
    const errorLogPath = path.join(this.errorDir, `${timestamp}_${path.parse(fileName).name}.error.log`);
    await fs.writeFile(errorLogPath, error);
    
    logger.info(`File moved to error: ${newPath}`);
  }

  async getInputFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.inputDir);
      return files
        .filter(file => ['.csv', '.xlsx', '.xls'].includes(path.extname(file).toLowerCase()))
        .map(file => path.join(this.inputDir, file));
    } catch (error) {
      logger.error('Failed to read input directory:', error);
      return [];
    }
  }
}