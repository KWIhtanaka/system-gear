#!/bin/bash

echo "=== システムギアEC テスト環境セットアップ ==="

# 現在のディレクトリを確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# PostgreSQL接続確認
echo "PostgreSQL接続確認中..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQLがインストールされていません"
    echo "インストール手順:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# データベース作成確認
echo "データベース確認中..."
if ! psql -lqt | cut -d \| -f 1 | grep -qw system_gear_ec; then
    echo "データベース system_gear_ec を作成中..."
    createdb system_gear_ec
fi

# バックエンドセットアップ
echo ""
echo "=== バックエンドセットアップ ==="
cd src/backend

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .envファイルを作成しました"
    echo "⚠️  必要に応じてDB接続情報を編集してください"
fi

if [ ! -d node_modules ]; then
    echo "npm install実行中..."
    npm install
fi

echo "データベーススキーマ作成中..."
psql -d system_gear_ec -f database/schema.sql > /dev/null 2>&1
echo "初期データ投入中..."
psql -d system_gear_ec -f database/initial_data.sql > /dev/null 2>&1

# バッチセットアップ
echo ""
echo "=== バッチシステムセットアップ ==="
cd ../batch

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .envファイルを作成しました"
fi

if [ ! -d node_modules ]; then
    echo "npm install実行中..."
    npm install
fi

# 必要なディレクトリ作成
mkdir -p input processed error logs

# フロントエンドセットアップ
echo ""
echo "=== フロントエンドセットアップ ==="
cd ../frontend

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .envファイルを作成しました"
fi

if [ ! -d node_modules ]; then
    echo "npm install実行中..."
    npm install
fi

cd "$SCRIPT_DIR"

echo ""
echo "=== セットアップ完了 ==="
echo ""
echo "起動手順:"
echo "1. バックエンドAPI:"
echo "   cd src/backend && npm run dev"
echo ""
echo "2. バッチシステム (別ターミナル):"
echo "   cd src/batch && npm run dev"
echo ""
echo "3. フロントエンド (別ターミナル):"
echo "   cd src/frontend && npm start"
echo ""
echo "4. ブラウザで http://localhost:3001 にアクセス"
echo "   ログイン: admin / admin123"
echo ""
echo "テストデータ:"
echo "   test-data/ ディレクトリにサンプルCSVファイルがあります"
echo ""
echo "詳細なテスト手順は TESTING_GUIDE.md をご確認ください"