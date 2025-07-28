# システムギア様向けECサイト機能拡張 STEP1

設計資料に基づいて実装されたシステムギア様のECサイト外部在庫取込機能です。

## プロジェクト構成

```
src/
├── backend/          # バックエンドAPI (Node.js/Express/TypeScript)
├── batch/           # バッチ処理システム (Node.js/TypeScript)
└── frontend/        # フロントエンド管理画面 (React/TypeScript)
```

## 機能概要

### 主要機能
- **外部在庫データ取込**: CSV/Excelファイルの受領・解析・DB登録
- **マッピングルール管理**: 仕入先ごとのデータ変換ルール設定
- **商品管理**: 在庫・価格情報の一元管理
- **エラー管理**: 取込エラーの確認・修正・再取込
- **ダッシュボード**: 取込状況・統計情報の可視化

### 技術スタック
- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **Batch**: Node.js, TypeScript, node-cron
- **Frontend**: React, TypeScript, Ant Design
- **Database**: PostgreSQL

## セットアップ

### 1. データベースセットアップ
```bash
# PostgreSQL接続後
\i src/backend/database/schema.sql
\i src/backend/database/initial_data.sql
```

### 2. バックエンドAPI
```bash
cd src/backend
npm install
cp .env.example .env
# .envを編集してDB接続情報を設定
npm run dev
```

### 3. バッチ処理システム
```bash
cd src/batch
npm install
cp .env.example .env
# .envを編集
npm run dev
```

### 4. フロントエンド
```bash
cd src/frontend
npm install
cp .env.example .env
# .envを編集してAPI URLを設定
npm start
```

## API仕様

### 認証
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト

### 商品管理
- `GET /api/products` - 商品一覧取得
- `GET /api/products/:id` - 商品詳細取得
- `GET /api/products/export/csv` - CSV出力

### マッピングルール
- `GET /api/mapping-rules` - ルール一覧取得
- `POST /api/mapping-rules` - ルール保存
- `POST /api/mapping-rules/test` - マッピングテスト

### 取込データ管理
- `POST /api/external-stock/import` - ファイルアップロード
- `GET /api/external-stock/history` - 取込履歴
- `GET /api/external-stock/errors` - エラー一覧
- `POST /api/external-stock/retry/:import_no` - 再取込

## バッチ処理

### データ取込バッチ
- ファイル受領・解析
- 中間テーブル登録
- エラー検出・ログ記録

### 在庫・単価登録バッチ
- 中間データ→本番テーブル登録
- 社内品目IDマッピング
- 過去データクリーンアップ

## データベース設計

主要テーブル:
- `chukan_file_tanka` - 中間ファイル単価
- `chukan_file_zaiko` - 中間ファイル在庫  
- `supplier_part` - 仕入先型番
- `supplier_price` - 仕入先単価
- `supplier_stock` - 仕入先在庫
- `item` - 品目マスタ
- `mapping_rules` - マッピングルール
- `error_logs` - エラーログ

## 運用

### ログイン情報
- 管理者: `admin` / `admin123`
- 一般ユーザー: `user01` / `admin123`

### ファイル取込
1. 管理画面「取込データ管理」でファイルアップロード
2. バッチ処理によるデータ変換・登録
3. エラー確認・修正・再取込

### マッピング設定
1. 「マッピング設定」で仕入先別ルール設定
2. テスト機能でマッピング確認
3. サンプルデータでの動作検証

## 設計資料との対応

本実装は以下の設計資料に準拠しています:
- `/docs_design/system_gear_ec_step1_detail_design.md`

### 実装済み機能
✅ データベース設計・DDL作成  
✅ バックエンドAPI基盤構築  
✅ バッチ処理基盤構築  
✅ データ取込バッチ実装  
✅ 在庫・単価登録バッチ実装  
✅ 商品一覧API実装  
✅ マッピングルールAPI実装  
✅ 取込データ管理API実装  
✅ フロントエンド基盤構築  
✅ 管理画面実装  

## 今後の拡張

STEP2以降で追加予定:
- 自動化スケジューリング
- AI補助機能
- 高度なエラー修正機能
- パフォーマンス最適化