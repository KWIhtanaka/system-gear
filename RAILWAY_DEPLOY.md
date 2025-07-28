# 🚀 Railway デプロイガイド

## 前提条件
- GitHub アカウント
- Railway アカウント（railway.app）
- Git 設定済み

## ステップ1: コードをGitHubにプッシュ

```bash
# プロジェクトディレクトリで実行
cd "/Users/htanaka/Development/System Gear"

# Gitリポジトリ初期化（未実行の場合）
git init
git add .
git commit -m "Initial commit: System Gear application"

# GitHubリポジトリ作成後
git remote add origin https://github.com/YOUR_USERNAME/system-gear.git
git branch -M main
git push -u origin main
```

## ステップ2: Railway プロジェクト作成

### 2.1 Railway にログイン
1. https://railway.app にアクセス
2. GitHub アカウントでログイン

### 2.2 新しいプロジェクト作成
1. "New Project" → "Deploy from GitHub repo"  
2. システムギアのリポジトリを選択
3. プロジェクト名を設定（例: `system-gear-test`）

## ステップ3: サービス設定

### 3.1 PostgreSQL データベース追加
1. プロジェクトダッシュボードで "+ New" をクリック
2. "Database" → "PostgreSQL" を選択
3. 自動でデータベースが作成される

### 3.2 バックエンド API サービス設定
1. "+ New" → "GitHub Repo" → 既存のリポジトリを選択
2. Root Directory: `src/backend`
3. Build Command: `npm run build`
4. Start Command: `npm start`

### 3.3 フロントエンド サービス設定  
1. "+ New" → "GitHub Repo" → 既存のリポジトリを選択
2. Root Directory: `src/frontend`
3. Build Command: `npm run build`
4. Start Command: `npx serve -s build -l 3000`

### 3.4 バッチ サービス設定
1. "+ New" → "GitHub Repo" → 既存のリポジトリを選択  
2. Root Directory: `src/batch`
3. Build Command: `npm run build`
4. Start Command: `npm start`

## ステップ4: 環境変数設定

### 4.1 バックエンド環境変数
```
DB_HOST=${PGHOST}
DB_PORT=${PGPORT}
DB_NAME=${PGDATABASE}
DB_USER=${PGUSER}
DB_PASSWORD=${PGPASSWORD}
JWT_SECRET=railway_production_jwt_secret_2025_secure_key
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://YOUR_FRONTEND_URL.railway.app
```

### 4.2 フロントエンド環境変数
```
REACT_APP_API_URL=https://YOUR_BACKEND_URL.railway.app/api
```

### 4.3 バッチ環境変数
```
DB_HOST=${PGHOST}
DB_PORT=${PGPORT}
DB_NAME=${PGDATABASE}
DB_USER=${PGUSER}
DB_PASSWORD=${PGPASSWORD}
NODE_ENV=production
```

## ステップ5: データベース初期化

### 5.1 Railway CLI インストール
```bash
# macOS
brew install railway

# npm
npm install -g @railway/cli
```

### 5.2 データベースセットアップ
```bash
# Railway にログイン
railway login

# プロジェクトに接続
railway link

# データベース接続
railway connect postgres

# スキーマ適用
\i src/backend/database/schema.sql

# 初期データ投入  
\i src/backend/database/initial_data.sql

# 接続終了
\q
```

## ステップ6: デプロイ実行

1. 各サービスの "Deploy" ボタンをクリック
2. ビルドログを確認
3. デプロイ完了後、URLを確認

## ステップ7: テスト用アクセス情報

### 7.1 アクセス URL
- **フロントエンド**: https://YOUR_FRONTEND_URL.railway.app
- **バックエンドAPI**: https://YOUR_BACKEND_URL.railway.app/api

### 7.2 テスト用ログイン
- **ユーザー名**: admin
- **パスワード**: admin123

## ステップ8: 外部テスター向け情報

### 8.1 アクセス手順書作成
```markdown
# システムギア テスト環境アクセス方法

## URL
https://YOUR_FRONTEND_URL.railway.app

## ログイン情報
- ユーザー名: admin  
- パスワード: admin123

## 主な機能
1. **ダッシュボード**: 統計情報の確認
2. **商品管理**: 商品一覧・検索・CSV出力
3. **マッピング設定**: データ変換ルール設定
4. **データ取込**: CSVファイルアップロード

## 注意事項
- テスト環境のため、データは予期せず削除される可能性があります
- 本番データは使用しないでください
- 問題発生時は開発チームまでご連絡ください
```

## トラブルシューティング

### ビルドエラーの場合
```bash
# ローカルでビルドテスト
cd src/backend
npm run build

cd ../frontend  
npm run build

cd ../batch
npm run build
```

### データベース接続エラーの場合
1. Railway ダッシュボードでPostgreSQLサービスの状態確認
2. 環境変数が正しく設定されているか確認
3. ネットワーク設定確認

### メモリ不足エラーの場合
1. Railway プランを確認（無料プランは制限あり）
2. 必要に応じて有料プランにアップグレード

## セキュリティ考慮事項（本番移行時）

1. **JWT_SECRET の変更**: より複雑な値に変更
2. **管理者パスワード変更**: admin123 から変更
3. **CORS設定**: 特定ドメインのみ許可
4. **Rate Limiting**: API呼び出し制限
5. **HTTPS強制**: すべての通信を暗号化

## 費用目安（Railway）

- **Starter Plan**: $5/月（テスト環境に最適）
- **Developer Plan**: $20/月（本格運用）

---

このガイドに従って設定すれば、約30分でテスト環境が構築できます。