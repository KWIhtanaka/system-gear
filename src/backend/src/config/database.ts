import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'system_gear_ec',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // パフォーマンス最適化設定
  max: 20, // 最大接続数
  min: 5,  // 最小接続数
  idleTimeoutMillis: 30000, // アイドルタイムアウト
  connectionTimeoutMillis: 5000, // 接続タイムアウト
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // 追加のパフォーマンス設定
  query_timeout: 30000, // クエリタイムアウト
  statement_timeout: 30000, // ステートメントタイムアウト
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;