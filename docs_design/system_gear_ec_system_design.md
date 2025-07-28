# システムギア様向けECサイト機能拡張 システム設計書

---

## 1. システム全体アーキテクチャ
- クラウド（AWS）上にWeb/AP/DBサーバを構築
- バックエンド：Java（SpringBoot）
- フロントエンド：Vue.js
- DB：PostgreSQL（Aurora/RDS）
- バッチ処理：SpringBatch等で実装
- 外部データ受領：SFTP/メール/手動アップロード対応

## 2. 構成図（論理）
```mermaid
flowchart TD
  subgraph ECサイト
    FE[フロントエンド(Vue.js)]
    BE[バックエンド(SpringBoot)]
    DB[(PostgreSQL)]
  end
  subgraph 外部
    SUP[仕入先]
    ADMIN[管理者]
  end
  SUP -- データファイル受領 --> BE
  ADMIN -- マッピング設定/エラー修正 --> FE
  FE -- API --> BE
  BE -- JDBC --> DB
  BE -- バッチ処理 --> DB
```

## 3. DB設計（主要テーブル抜粋）
- products, products_description, categories_description, manufacturers, manufacturers_list, manufacturers_status
- 新規：
  - external_stock_master（仕入先在庫・単価・型番マスタ）
  - external_stock_staging（中間テーブル）
  - mapping_rules（マッピングルール管理）
- 詳細はdetailed_requirements_definition.md参照

## 4. バッチ設計
### 4.1. データ受領バッチ
- 仕入先ごとに異なるフォーマットのファイルを受領
- ファイルをexternal_stock_stagingに格納
- 取込管理No.自動採番

### 4.2. マッピング・本番反映バッチ
- mapping_rulesに従い、staging→masterへデータ移送
- エラーはエラーテーブルに記録、管理画面で修正・再取込
- 古いデータは取込管理No.で一括削除

## 5. API設計（例）
| メソッド | パス | 概要 |
|----------|------|------|
| GET | /api/products | 商品一覧取得 |
| GET | /api/products/{id} | 商品詳細取得 |
| POST | /api/external-stock/import | 外部在庫データ取込 |
| GET | /api/external-stock/errors | エラーデータ一覧取得 |
| POST | /api/external-stock/retry | エラーデータ再取込 |
| GET | /api/mapping-rules | マッピングルール一覧取得 |
| POST | /api/mapping-rules | マッピングルール登録・更新 |

## 6. 運用設計
- バッチ処理は日次/週次で自動実行（スケジューラ管理）
- エラー発生時は管理者にメール通知
- マッピングルール・仕入先追加は管理画面から実施
- 障害時はログ・エラーテーブルで原因特定

## 7. セキュリティ・可用性
- SFTP/メール受領時のウイルスチェック
- DB・API認証/認可
- AWSの冗長化・バックアップ設計

## 8. 今後の拡張
- 仕入先API連携（自動データ取得）
- AIによるエラーデータ自動修正
- 既存基幹システムとのAPI連携強化 