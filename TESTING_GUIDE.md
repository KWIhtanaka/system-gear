# システムテスト手順書

## 前提条件

### 必要ソフトウェア
- Node.js (18.x以降)
- PostgreSQL (14.x以降)
- npm または yarn

### PostgreSQLセットアップ
```bash
# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# データベース作成
createdb system_gear_ec

# ユーザー作成（必要に応じて）
psql postgres
CREATE USER postgres WITH PASSWORD 'your_password';
ALTER USER postgres CREATEDB;
\q
```

## テスト手順

### 1. データベースセットアップ

```bash
cd "src/backend"

# スキーマ作成
psql -d system_gear_ec -f database/schema.sql

# 初期データ投入
psql -d system_gear_ec -f database/initial_data.sql
```

### 2. バックエンドAPI起動

```bash
cd "src/backend"
npm install
cp .env.example .env

# .envファイルを編集（DB接続情報）
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=system_gear_ec
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your_jwt_secret_key_here

npm run dev
```

APIサーバーが http://localhost:3000 で起動します。

### 3. バッチシステム起動（別ターミナル）

```bash
cd "src/batch"
npm install
cp .env.example .env

# .envファイルを編集（同じDB接続情報）

npm run dev
```

### 4. フロントエンド起動（別ターミナル）

```bash
cd "src/frontend"
npm install
cp .env.example .env

# .envファイルを編集
# REACT_APP_API_URL=http://localhost:3000/api

npm start
```

フロントエンドが http://localhost:3001 で起動します。

## テストシナリオ

### ログインテスト
1. ブラウザで http://localhost:3001 にアクセス
2. 以下の認証情報でログイン：
   - ユーザー名: `admin`
   - パスワード: `admin123`

### ダッシュボード確認
- ログイン後、統計情報が表示されることを確認

### 商品管理テスト
1. 「商品管理」メニューをクリック
2. 商品一覧が表示されることを確認
3. 検索機能をテスト：
   - 商品名で検索
   - 型番で検索
   - 仕入先で検索
4. CSV出力ボタンをクリックして出力テスト

### マッピング設定テスト
1. 「マッピング設定」メニューをクリック
2. 仕入先選択（supplier_a）
3. 既存のマッピングルールが表示されることを確認
4. 新しいルール追加テスト：
   - 「ルール追加」ボタンをクリック
   - 項目を入力して保存
5. マッピングテスト機能：
   - 「テスト」ボタンをクリック
   - サンプルJSONを入力してテスト実行

### データ取込テスト

#### テスト用CSVファイル作成
```bash
mkdir -p "src/batch/input"
```

テスト用在庫ファイル（supplier_a_stock.csv）:
```csv
part_number,maker_name,stock_qty,min_order,package_qty
PART-A001,メーカーA,150,10,1
PART-A002,メーカーA,200,5,1
PART-A003,メーカーA,50,20,1
```

テスト用単価ファイル（supplier_a_price.csv）:
```csv
part_number,maker_name,unit_price,currency,quantity
PART-A001,メーカーA,1200,JPY,1
PART-A002,メーカーA,1800,JPY,1
PART-A003,メーカーA,2500,JPY,1
```

#### ファイルアップロードテスト
1. 「取込データ管理」メニューをクリック
2. 仕入先を選択（supplier_a）
3. 作成したCSVファイルをアップロード
4. 取込履歴でステータス確認
5. エラーがある場合は「エラー」ボタンで詳細確認

## APIテスト（curl）

### 認証テスト
```bash
# ログイン
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 商品一覧取得
```bash
# JWTトークンを取得後
TOKEN="your_jwt_token_here"

curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

### マッピングルール取得
```bash
curl -X GET "http://localhost:3000/api/mapping-rules?supplier=supplier_a" \
  -H "Authorization: Bearer $TOKEN"
```

## トラブルシューティング

### よくあるエラー

#### データベース接続エラー
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
対処法：
- PostgreSQLが起動しているか確認
- .envファイルのDB接続情報を確認

#### ポート競合エラー
```
Error: listen EADDRINUSE :::3000
```
対処法：
- 別のプロセスがポートを使用していないか確認
- ポート番号を変更

#### JWT_SECRET未設定エラー
```
Error: JWT_SECRET is not configured
```
対処法：
- .envファイルにJWT_SECRETを設定

### ログ確認
```bash
# バックエンドログ
tail -f src/backend/logs/combined.log

# バッチログ
tail -f src/batch/logs/batch-combined.log
```

## 期待される結果

### 成功時の動作
1. ログインが正常に完了
2. ダッシュボードで統計情報表示
3. 商品一覧で検索・フィルタリング動作
4. CSVファイルの取込・変換が正常完了
5. エラー管理画面でエラー内容確認
6. マッピングルール設定・テストが動作

### 検証ポイント
- データの一貫性（中間テーブル→本番テーブル）
- エラーハンドリング（不正データでのテスト）
- UI/UXの操作性
- パフォーマンス（大量データでのテスト）

## 注意事項
- テスト時は本番データと混在しないよう注意
- エラーログを確認して問題を特定
- 初回起動時はnpm installに時間がかかる場合があります