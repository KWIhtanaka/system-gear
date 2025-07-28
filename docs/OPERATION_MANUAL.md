# System Gear EC外部在庫取込システム 運用マニュアル

## 目次
1. [システム概要](#システム概要)
2. [デプロイメント手順](#デプロイメント手順)
3. [監視・メンテナンス](#監視メンテナンス)
4. [トラブルシューティング](#トラブルシューティング)
5. [セキュリティ運用](#セキュリティ運用)
6. [パフォーマンス監視](#パフォーマンス監視)
7. [バックアップ・リストア](#バックアップリストア)

## システム概要

### アーキテクチャ
- **フロントエンド**: React 18 + TypeScript
- **バックエンド**: Node.js + Express + TypeScript
- **データベース**: PostgreSQL 14+
- **バッチ処理**: Node.js + node-cron
- **キャッシュ**: Redis（オプション）+ node-cache

### 主要機能
- 外部在庫データの自動取込
- 商品マッピングルール管理
- 在庫・単価情報の管理
- データエクスポート機能
- リアルタイム監視ダッシュボード

## デプロイメント手順

### 1. 環境準備

#### 必要なソフトウェア
```bash
# Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 14
sudo apt update
sudo apt install postgresql postgresql-contrib

# Redis (オプション)
sudo apt install redis-server

# PM2 (プロセス管理)
npm install -g pm2
```

#### データベースセットアップ
```bash
# PostgreSQLユーザー作成
sudo -u postgres createuser --interactive
# データベース作成
sudo -u postgres createdb system_gear_ec
# スキーマ適用
psql -U postgres -d system_gear_ec -f database/schema.sql
# 初期データ投入
psql -U postgres -d system_gear_ec -f database/initial_data.sql
```

### 2. アプリケーションデプロイ

#### 環境変数設定
```bash
# バックエンド用 .env
cat > /opt/system-gear/backend/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=system_gear_ec
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
NODE_ENV=production
PORT=3000
UPLOAD_DIR=/opt/system-gear/uploads
LOG_DIR=/var/log/system-gear

# Security Configuration
FRONTEND_URL=https://your-frontend-domain.com
REDIS_URL=redis://localhost:6379

# Performance Configuration
DB_POOL_MIN=5
DB_POOL_MAX=20
CACHE_TTL=300
EOF

# フロントエンド用 .env
cat > /opt/system-gear/frontend/.env << EOF
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_ENVIRONMENT=production
PORT=3001
EOF

# バッチ用 .env
cat > /opt/system-gear/batch/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=system_gear_ec
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Batch Configuration
NODE_ENV=production
LOG_LEVEL=info
LOG_DIR=/var/log/system-gear

# File Processing Configuration
INPUT_DIR=/opt/system-gear/batch_imports
PROCESSED_DIR=/opt/system-gear/processed
ERROR_DIR=/opt/system-gear/error

# Batch Schedule Configuration
STOCK_UPDATE_CRON=0 */6 * * *
DATA_IMPORT_CRON=0 0 * * *
EOF
```

#### ビルド・デプロイ
```bash
# バックエンド
cd /opt/system-gear/backend
npm ci --only=production
npm run build

# フロントエンド
cd /opt/system-gear/frontend
npm ci --only=production
npm run build

# バッチ
cd /opt/system-gear/batch
npm ci --only=production
npm run build
```

#### PM2設定
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'system-gear-api',
      script: './dist/index.js',
      cwd: '/opt/system-gear/backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/system-gear/api-error.log',
      out_file: '/var/log/system-gear/api-out.log',
      log_file: '/var/log/system-gear/api-combined.log',
      time: true,
      max_memory_restart: '1G'
    },
    {
      name: 'system-gear-batch',
      script: './dist/index.js',
      cwd: '/opt/system-gear/batch',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/system-gear/batch-error.log',
      out_file: '/var/log/system-gear/batch-out.log',
      log_file: '/var/log/system-gear/batch-combined.log',
      time: true,
      max_memory_restart: '512M'
    }
  ]
};
```

#### Nginx設定
```nginx
# /etc/nginx/sites-available/system-gear
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Static files
    location / {
        root /opt/system-gear/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}

# Rate limiting
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

## 監視・メンテナンス

### 1. ログ監視

#### ログローテーション設定
```bash
# /etc/logrotate.d/system-gear
/var/log/system-gear/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

#### 重要ログポイント
- **API エラー**: `[ERROR]` レベルのログ
- **認証失敗**: `Auth rate limit exceeded` メッセージ
- **データベースエラー**: PostgreSQL接続エラー
- **ファイル処理エラー**: バッチ処理での変換エラー

### 2. パフォーマンス監視

#### PM2 モニタリング
```bash
# プロセス状況確認
pm2 status

# リアルタイム監視
pm2 monit

# CPU/メモリ使用率確認
pm2 show system-gear-api
```

#### データベース監視
```sql
-- 長時間実行中のクエリ
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- 接続数確認
SELECT count(*) as connections 
FROM pg_stat_activity;

-- インデックス使用率
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public';
```

#### システムリソース監視
```bash
# CPU/メモリ使用率
top -p $(pgrep -f "system-gear")

# ディスク使用率
df -h /opt/system-gear
df -h /var/log/system-gear

# ネットワーク接続
netstat -tlnp | grep :3000
```

### 3. 定期メンテナンス

#### 日次タスク
```bash
#!/bin/bash
# daily_maintenance.sh

# ログローテーション確認
logrotate -f /etc/logrotate.d/system-gear

# ディスク容量チェック
DISK_USAGE=$(df /opt/system-gear | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "WARNING: Disk usage is ${DISK_USAGE}%" | mail -s "System Gear Disk Alert" admin@your-domain.com
fi

# データベースバックアップ
pg_dump -U postgres system_gear_ec | gzip > /backup/system_gear_ec_$(date +%Y%m%d).sql.gz

# 古いバックアップ削除（30日以上）
find /backup -name "system_gear_ec_*.sql.gz" -mtime +30 -delete
```

#### 週次タスク
```bash
#!/bin/bash
# weekly_maintenance.sh

# データベース統計更新
psql -U postgres -d system_gear_ec -c "VACUUM ANALYZE;"

# 古いログファイル圧縮
find /var/log/system-gear -name "*.log" -mtime +7 -exec gzip {} \;

# PM2プロセス再起動
pm2 restart all
```

## トラブルシューティング

### 1. よくある問題

#### API サーバーが起動しない
```bash
# ポート使用確認
sudo lsof -i :3000

# プロセス確認
pm2 list
pm2 logs system-gear-api

# 設定確認
cd /opt/system-gear/backend
npm run build
node dist/index.js
```

#### データベース接続エラー
```bash
# PostgreSQL稼働確認
sudo systemctl status postgresql

# 接続テスト
psql -U postgres -d system_gear_ec -c "SELECT 1;"

# 接続数確認
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

#### ファイルアップロード失敗
```bash
# ディスク容量確認
df -h /opt/system-gear/uploads

# 権限確認
ls -la /opt/system-gear/uploads
sudo chown -R www-data:www-data /opt/system-gear/uploads
sudo chmod -R 755 /opt/system-gear/uploads
```

#### バッチ処理が実行されない
```bash
# バッチプロセス確認
pm2 logs system-gear-batch

# cron設定確認
crontab -l

# 手動実行テスト
cd /opt/system-gear/batch
npm run start
```

### 2. エラーコード一覧

| エラーコード | 説明 | 対処法 |
|-------------|------|--------|
| DB_CONNECTION_ERROR | データベース接続失敗 | PostgreSQL稼働確認、接続設定確認 |
| FILE_UPLOAD_ERROR | ファイルアップロード失敗 | ディスク容量、権限確認 |
| AUTH_TOKEN_INVALID | 認証トークン無効 | ログイン状態確認、JWT秘密鍵確認 |
| MAPPING_RULE_ERROR | マッピングルールエラー | ルール設定確認、データ形式確認 |
| BATCH_PROCESS_ERROR | バッチ処理エラー | ログ確認、ファイル形式確認 |

## セキュリティ運用

### 1. セキュリティ監視

#### 不正アクセス検知
```bash
# 不正ログイン試行
grep "Auth rate limit exceeded" /var/log/system-gear/api-combined.log

# 大量リクエスト検知
grep "Too many requests" /var/log/system-gear/api-combined.log

# ファイルアップロード監視
grep "Invalid file type" /var/log/system-gear/api-combined.log
```

#### セキュリティアラート
```bash
#!/bin/bash
# security_monitor.sh

# 1時間以内の不正アクセス試行をカウント
FAILED_ATTEMPTS=$(grep "$(date -d '1 hour ago' +'%Y-%m-%d %H')" /var/log/system-gear/api-combined.log | grep -c "rate limit exceeded")

if [ $FAILED_ATTEMPTS -gt 10 ]; then
    echo "WARNING: ${FAILED_ATTEMPTS} failed login attempts in the last hour" | mail -s "Security Alert" admin@your-domain.com
fi
```

### 2. 定期セキュリティタスク

#### SSL証明書更新
```bash
# Let's Encrypt証明書更新
certbot renew --quiet
nginx -t && systemctl reload nginx
```

#### セキュリティアップデート
```bash
# パッケージ更新
apt update && apt upgrade -y

# Node.js セキュリティ監査
cd /opt/system-gear/backend && npm audit
cd /opt/system-gear/frontend && npm audit
cd /opt/system-gear/batch && npm audit
```

## パフォーマンス監視

### 1. 監視指標

#### API パフォーマンス
- レスポンス時間: 平均 < 500ms
- エラー率: < 1%
- スループット: > 100 req/sec

#### データベース
- 接続数: < 80% of max_connections
- クエリ実行時間: 平均 < 100ms
- インデックス使用率: > 95%

#### システムリソース
- CPU使用率: < 70%
- メモリ使用率: < 80%
- ディスク使用率: < 80%

### 2. 最適化施策

#### データベース最適化
```sql
-- インデックス作成
CREATE INDEX CONCURRENTLY idx_chukan_file_tanka_supplier_date 
ON chukan_file_tanka(supplier_id, import_date);

-- 統計情報更新
ANALYZE chukan_file_tanka;

-- 不要データ削除
DELETE FROM error_log WHERE created_at < NOW() - INTERVAL '6 months';
```

#### キャッシュ最適化
```bash
# Redis設定調整
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## バックアップ・リストア

### 1. バックアップ戦略

#### データベースバックアップ
```bash
# 毎日のフルバックアップ
pg_dump -U postgres -Fc system_gear_ec > backup_$(date +%Y%m%d).dump

# 継続的なWALアーカイブ（本番環境推奨）
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

#### ファイルバックアップ
```bash
# アップロードファイル
tar -czf uploads_$(date +%Y%m%d).tar.gz /opt/system-gear/uploads

# 設定ファイル
tar -czf config_$(date +%Y%m%d).tar.gz /opt/system-gear/*/.env
```

### 2. リストア手順

#### データベースリストア
```bash
# サービス停止
pm2 stop all

# データベースリストア
pg_restore -U postgres -d system_gear_ec -c backup_20231027.dump

# サービス再開
pm2 start all
```

#### ファイルリストア
```bash
# アップロードファイルリストア
tar -xzf uploads_20231027.tar.gz -C /

# 権限修正
chown -R www-data:www-data /opt/system-gear/uploads
```

## 緊急時対応

### 1. 障害対応フロー

1. **障害検知**
   - 監視アラート確認
   - ログ確認
   - 影響範囲特定

2. **初期対応**
   - 障害通知
   - 一時的な回避策実施
   - 詳細調査開始

3. **復旧作業**
   - 根本原因特定
   - 修正作業実施
   - 動作確認

4. **事後対応**
   - 障害報告書作成
   - 再発防止策検討
   - 監視強化

### 2. 緊急連絡先

- **システム管理者**: admin@your-domain.com
- **データベース管理者**: dba@your-domain.com
- **セキュリティ担当**: security@your-domain.com

---

本マニュアルは定期的に更新してください。
最終更新: 2024年10月27日