#!/bin/bash

echo "=== Docker版 PostgreSQL セットアップ ==="

# Dockerがインストールされているかチェック
if ! command -v docker &> /dev/null; then
    echo "❌ Dockerがインストールされていません"
    echo "Docker Desktop をインストールしてください: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Docker Composeがインストールされているかチェック
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Composeがインストールされていません"
    exit 1
fi

echo "Docker でPostgreSQLを起動中..."
docker-compose up -d postgres

echo "PostgreSQLの起動を待機中..."
sleep 10

# データベース接続テスト
echo "データベース接続テスト中..."
docker-compose exec postgres psql -U postgres -d system_gear_ec -c "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQLが正常に起動しました"
    
    # スキーマとデータの投入
    echo "データベーススキーマ作成中..."
    docker-compose exec -T postgres psql -U postgres -d system_gear_ec < src/backend/database/schema.sql
    
    echo "初期データ投入中..."
    docker-compose exec -T postgres psql -U postgres -d system_gear_ec < src/backend/database/initial_data.sql
    
    # .envファイルの更新
    echo "環境設定ファイル更新中..."
    
    # Backend .env
    if [ -f src/backend/.env ]; then
        sed -i.bak 's/DB_PASSWORD=.*/DB_PASSWORD=postgres123/' src/backend/.env
    else
        cp src/backend/.env.example src/backend/.env
        sed -i.bak 's/DB_PASSWORD=.*/DB_PASSWORD=postgres123/' src/backend/.env
    fi
    
    # Batch .env
    if [ -f src/batch/.env ]; then
        sed -i.bak 's/DB_PASSWORD=.*/DB_PASSWORD=postgres123/' src/batch/.env
    else
        cp src/batch/.env.example src/batch/.env
        sed -i.bak 's/DB_PASSWORD=.*/DB_PASSWORD=postgres123/' src/batch/.env
    fi
    
    echo ""
    echo "=== セットアップ完了 ==="
    echo "PostgreSQL: http://localhost:5432"
    echo "Database: system_gear_ec"
    echo "User: postgres"
    echo "Password: postgres123"
    echo ""
    echo "次の手順:"
    echo "1. cd src/backend && npm install && npm run dev"
    echo "2. cd src/batch && npm install && npm run dev (別ターミナル)"
    echo "3. cd src/frontend && npm install && npm start (別ターミナル)"
    
else
    echo "❌ PostgreSQLの起動に失敗しました"
    docker-compose logs postgres
fi