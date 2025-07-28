# 🚀 即座に外部アクセス可能にする方法（ngrok）

## 方法1: ngrok を使用（最も簡単）

### 1. ngrok インストール
```bash
# macOS
brew install ngrok

# または公式サイトからダウンロード
# https://ngrok.com/download
```

### 2. ngrok アカウント作成・認証
```bash
# https://dashboard.ngrok.com/signup でアカウント作成
# 認証トークンを取得して設定
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 3. フロントエンドを外部公開
```bash
# 新しいターミナルで実行
ngrok http 3001
```

### 4. 結果の確認
ngrok実行後、以下のような出力が表示されます：
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3001
```

この `https://abc123.ngrok.io` が外部からアクセス可能なURLです。

### 5. テスター向け情報
```
テスト環境URL: https://abc123.ngrok.io
ログイン情報:
- ユーザー名: admin
- パスワード: admin123

注意：
- このURLは一時的なものです
- ngrokを停止すると無効になります  
- 8時間で自動的に期限切れになります（無料版）
```

## 方法2: Cloudflare Tunnel（より本格的）

### 1. cloudflared インストール
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# 認証
cloudflared tunnel login
```

### 2. トンネル作成
```bash
# トンネル作成
cloudflared tunnel create system-gear-test

# 設定ファイル作成  
cat > ~/.cloudflared/config.yml << EOF
tunnel: system-gear-test
credentials-file: ~/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: system-gear-test.your-domain.com
    service: http://localhost:3001
  - service: http_status:404
EOF

# DNS設定
cloudflared tunnel route dns system-gear-test system-gear-test.your-domain.com

# トンネル実行
cloudflared tunnel run system-gear-test
```

## 方法3: Localtunnel（最もシンプル）

### 1. インストール・実行
```bash
# インストール
npm install -g localtunnel

# 実行（フロントエンドポート3001を公開）
lt --port 3001 --subdomain system-gear-test
```

### 2. アクセス
```
URL: https://system-gear-test.loca.lt
パスワード設定が求められる場合があります
```

## 推奨順序

1. **すぐテストしたい** → ngrok (5分で完了)
2. **1-2週間テスト** → Railway (30分で完了)  
3. **本格運用** → 自社サーバー/AWS/GCP (数時間)

## セキュリティ注意点

⚠️ **重要**: 外部公開する前に以下を確認してください

1. **テストデータのみ使用**
2. **本番データは絶対に使わない** 
3. **信頼できるテスターのみにURL共有**
4. **テスト完了後は必ずサービス停止**

## 現在のシステム状況

✅ バックエンド: http://localhost:3000
✅ フロントエンド: http://localhost:3001  
✅ データベース: PostgreSQL起動中

ngrokを使えば、今すぐ外部アクセス可能になります！