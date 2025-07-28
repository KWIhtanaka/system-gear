# System Gear EC外部在庫取込システム デプロイメントガイド

## 目次
1. [システム要件](#システム要件)
2. [開発環境セットアップ](#開発環境セットアップ)
3. [本番環境デプロイ](#本番環境デプロイ)
4. [CI/CD パイプライン](#cicd-パイプライン)
5. [環境別設定](#環境別設定)
6. [セキュリティ設定](#セキュリティ設定)

## システム要件

### 最小システム要件
- **OS**: Ubuntu 20.04 LTS / CentOS 8 / Amazon Linux 2
- **CPU**: 2コア以上
- **メモリ**: 4GB以上
- **ストレージ**: 50GB以上（SSD推奨）
- **ネットワーク**: 100Mbps以上

### 推奨システム要件
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 4コア以上
- **メモリ**: 8GB以上
- **ストレージ**: 100GB以上（SSD）
- **ネットワーク**: 1Gbps

### 必要なソフトウェア
- Node.js 18.x LTS
- PostgreSQL 14+
- Redis 6.x（オプション）
- Nginx 1.20+
- PM2（プロセス管理）

## 開発環境セットアップ

### 1. 前提条件の確認
```bash
# Node.js バージョン確認
node --version  # v18.x.x

# PostgreSQL バージョン確認
psql --version  # 14.x

# Git バージョン確認
git --version
```

### 2. リポジトリのクローン
```bash
git clone https://github.com/your-org/system-gear-ec.git
cd system-gear-ec
```

### 3. データベースセットアップ
```bash
# PostgreSQL サービス開始
sudo systemctl start postgresql

# データベース作成
sudo -u postgres createdb system_gear_ec

# ユーザー作成
sudo -u postgres psql -c "CREATE USER system_gear WITH PASSWORD 'development';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE system_gear_ec TO system_gear;"

# スキーマ適用
psql -U system_gear -d system_gear_ec -f src/backend/database/schema.sql

# 初期データ投入
psql -U system_gear -d system_gear_ec -f src/backend/database/initial_data.sql
```

### 4. 環境変数設定
```bash
# バックエンド
cp src/backend/.env.example src/backend/.env
# 必要に応じて設定値を編集

# フロントエンド
cp src/frontend/.env.example src/frontend/.env
# 必要に応じて設定値を編集

# バッチ
cp src/batch/.env.example src/batch/.env
# 必要に応じて設定値を編集
```

### 5. 依存関係のインストール
```bash
# バックエンド
cd src/backend
npm install

# フロントエンド
cd ../frontend
npm install

# バッチ
cd ../batch
npm install
```

### 6. 開発サーバー起動
```bash
# ターミナル1: バックエンド
cd src/backend
npm run dev

# ターミナル2: フロントエンド
cd src/frontend
npm start

# ターミナル3: バッチ
cd src/batch
npm run dev
```

## 本番環境デプロイ

### 1. サーバー準備

#### システムアップデート
```bash
sudo apt update && sudo apt upgrade -y
```

#### Node.js インストール
```bash
# NodeSource リポジトリ追加
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.js インストール
sudo apt install -y nodejs

# バージョン確認
node --version
npm --version
```

#### PostgreSQL インストール
```bash
# PostgreSQL インストール
sudo apt install -y postgresql postgresql-contrib

# サービス開始・自動起動設定
sudo systemctl start postgresql
sudo systemctl enable postgresql

# postgres ユーザーのパスワード設定
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_secure_password';"
```

#### Redis インストール（オプション）
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Nginx インストール
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### PM2 インストール
```bash
npm install -g pm2
```

### 2. アプリケーションデプロイ

#### ディレクトリ作成
```bash
sudo mkdir -p /opt/system-gear
sudo chown $USER:$USER /opt/system-gear
```

#### コード取得
```bash
cd /opt/system-gear
git clone https://github.com/your-org/system-gear-ec.git .
```

#### 本番用環境変数設定
```bash
# バックエンド用 .env
cat > src/backend/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=system_gear_ec
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h

# Server Configuration
NODE_ENV=production
PORT=3000
UPLOAD_DIR=/opt/system-gear/uploads
LOG_DIR=/var/log/system-gear

# Security Configuration
FRONTEND_URL=https://your-domain.com
REDIS_URL=redis://localhost:6379

# Performance Configuration
DB_POOL_MIN=5
DB_POOL_MAX=20
CACHE_TTL=300
EOF

# フロントエンド用 .env
cat > src/frontend/.env << EOF
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_ENVIRONMENT=production
EOF

# バッチ用 .env
cat > src/batch/.env << EOF
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

#### ディレクトリ作成・権限設定
```bash
# ログディレクトリ
sudo mkdir -p /var/log/system-gear
sudo chown $USER:$USER /var/log/system-gear

# アップロードディレクトリ
mkdir -p /opt/system-gear/uploads
mkdir -p /opt/system-gear/batch_imports
mkdir -p /opt/system-gear/processed
mkdir -p /opt/system-gear/error

# 権限設定
chmod 755 /opt/system-gear/uploads
chmod 755 /opt/system-gear/batch_imports
```

#### データベースセットアップ
```bash
# データベース作成
sudo -u postgres createdb system_gear_ec

# スキーマ適用
sudo -u postgres psql -d system_gear_ec -f src/backend/database/schema.sql

# 初期データ投入
sudo -u postgres psql -d system_gear_ec -f src/backend/database/initial_data.sql
```

#### ビルド
```bash
# バックエンド
cd src/backend
npm ci --only=production
npm run build

# フロントエンド
cd ../frontend
npm ci --only=production
npm run build

# バッチ
cd ../batch
npm ci --only=production
npm run build
```

### 3. PM2設定

#### ecosystem.config.js 作成
```javascript
module.exports = {
  apps: [
    {
      name: 'system-gear-api',
      script: './dist/index.js',
      cwd: '/opt/system-gear/src/backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/system-gear/api-error.log',
      out_file: '/var/log/system-gear/api-out.log',
      log_file: '/var/log/system-gear/api-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    },
    {
      name: 'system-gear-batch',
      script: './dist/index.js',
      cwd: '/opt/system-gear/src/batch',
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

#### PM2 起動・設定
```bash
# アプリケーション起動
pm2 start ecosystem.config.js

# 自動起動設定
pm2 startup
pm2 save

# 状態確認
pm2 status
pm2 monit
```

### 4. Nginx設定

#### SSL証明書取得（Let's Encrypt）
```bash
# Certbot インストール
sudo apt install -y certbot python3-certbot-nginx

# SSL証明書取得
sudo certbot --nginx -d your-domain.com
```

#### Nginx設定ファイル
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

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # API proxy
    location /api/ {
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # File upload
        client_max_body_size 10M;
    }

    # Authentication endpoints with stricter rate limiting
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location / {
        root /opt/system-gear/src/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
        
        # Cache HTML files for shorter period
        location ~* \.(html)$ {
            expires 1h;
            add_header Cache-Control "public, must-revalidate";
        }
    }

    # Security
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

#### Nginx設定有効化
```bash
# 設定ファイルリンク
sudo ln -s /etc/nginx/sites-available/system-gear /etc/nginx/sites-enabled/

# デフォルト設定削除
sudo rm /etc/nginx/sites-enabled/default

# 設定テスト
sudo nginx -t

# Nginx再起動
sudo systemctl restart nginx
```

## CI/CD パイプライン

### GitHub Actions設定

#### .github/workflows/deploy.yml
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: system_gear_ec_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: |
          src/backend/package-lock.json
          src/frontend/package-lock.json
          src/batch/package-lock.json
    
    - name: Install backend dependencies
      run: |
        cd src/backend
        npm ci
    
    - name: Run backend tests
      run: |
        cd src/backend
        npm test
      env:
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: system_gear_ec_test
        DB_USER: postgres
        DB_PASSWORD: postgres
        JWT_SECRET: test_secret
    
    - name: Install frontend dependencies
      run: |
        cd src/frontend
        npm ci
    
    - name: Run frontend tests
      run: |
        cd src/frontend
        npm test -- --coverage --watchAll=false
    
    - name: Build frontend
      run: |
        cd src/frontend
        npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/system-gear
          git pull origin main
          
          # Backend build
          cd src/backend
          npm ci --only=production
          npm run build
          
          # Frontend build
          cd ../frontend
          npm ci --only=production
          npm run build
          
          # Batch build
          cd ../batch
          npm ci --only=production
          npm run build
          
          # Restart services
          pm2 restart all
          
          # Health check
          sleep 10
          curl -f http://localhost:3000/api/health || exit 1
```

### デプロイスクリプト

#### deploy.sh
```bash
#!/bin/bash

set -e

echo "Starting deployment..."

# Variables
APP_DIR="/opt/system-gear"
BACKUP_DIR="/opt/system-gear-backup-$(date +%Y%m%d%H%M%S)"

# Create backup
echo "Creating backup..."
cp -r $APP_DIR $BACKUP_DIR

# Pull latest code
echo "Pulling latest code..."
cd $APP_DIR
git pull origin main

# Install dependencies and build
echo "Building backend..."
cd src/backend
npm ci --only=production
npm run build

echo "Building frontend..."
cd ../frontend
npm ci --only=production
npm run build

echo "Building batch..."
cd ../batch
npm ci --only=production
npm run build

# Database migration (if needed)
echo "Running database migrations..."
cd ../backend
npm run migrate

# Restart services
echo "Restarting services..."
pm2 restart all

# Health check
echo "Performing health check..."
sleep 10
if curl -f http://localhost:3000/api/health; then
    echo "Deployment successful!"
    
    # Clean up old backups (keep last 5)
    ls -dt /opt/system-gear-backup-* | tail -n +6 | xargs rm -rf
else
    echo "Health check failed! Rolling back..."
    pm2 stop all
    rm -rf $APP_DIR
    mv $BACKUP_DIR $APP_DIR
    cd $APP_DIR/src/backend
    pm2 start ecosystem.config.js
    exit 1
fi
```

## 環境別設定

### 開発環境（Development）
```bash
# .env.development
NODE_ENV=development
DB_NAME=system_gear_ec_dev
LOG_LEVEL=debug
CACHE_TTL=60
```

### ステージング環境（Staging）
```bash
# .env.staging
NODE_ENV=staging
DB_NAME=system_gear_ec_staging
LOG_LEVEL=info
CACHE_TTL=300
```

### 本番環境（Production）
```bash
# .env.production
NODE_ENV=production
DB_NAME=system_gear_ec
LOG_LEVEL=warn
CACHE_TTL=600
```

## セキュリティ設定

### 1. ファイアウォール設定
```bash
# UFW設定
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. fail2ban設定
```bash
# fail2ban インストール
sudo apt install -y fail2ban

# 設定ファイル作成
sudo cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 600
findtime = 600
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10
EOF

# fail2ban 起動
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. SSH セキュリティ強化
```bash
# SSH設定編集
sudo nano /etc/ssh/sshd_config

# 以下の設定を変更
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 2222  # デフォルトポート変更

# SSH再起動
sudo systemctl restart ssh
```

### 4. 自動セキュリティアップデート
```bash
# unattended-upgrades インストール
sudo apt install -y unattended-upgrades

# 設定
sudo dpkg-reconfigure -plow unattended-upgrades
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. PM2プロセスが起動しない
```bash
# ログ確認
pm2 logs

# プロセス削除・再作成
pm2 delete all
pm2 start ecosystem.config.js
```

#### 2. データベース接続エラー
```bash
# PostgreSQL状態確認
sudo systemctl status postgresql

# 接続テスト
psql -U postgres -d system_gear_ec -c "SELECT 1;"
```

#### 3. Nginx設定エラー
```bash
# 設定テスト
sudo nginx -t

# ログ確認
sudo tail -f /var/log/nginx/error.log
```

#### 4. SSL証明書エラー
```bash
# 証明書更新
sudo certbot renew

# Nginx再起動
sudo systemctl restart nginx
```

---

デプロイメントに関する質問や問題がある場合は、開発チームまでお問い合わせください。