-- システムギア様ECサイト機能拡張 STEP1 データベーススキーマ
-- PostgreSQL 14+ 想定

-- 中間ファイル単価テーブル
CREATE TABLE chukan_file_tanka (
  import_no      BIGINT NOT NULL,
  import_date    DATE NOT NULL,
  supplier_id    VARCHAR(64) NOT NULL,
  supplier_maker VARCHAR(128),
  supplier_part_no VARCHAR(128) NOT NULL,
  quantity       INTEGER,
  price          DECIMAL(15,4),
  currency       VARCHAR(8),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (import_no, supplier_id, supplier_part_no)
);

-- 中間ファイル在庫テーブル
CREATE TABLE chukan_file_zaiko (
  import_no      BIGINT NOT NULL,
  import_date    DATE NOT NULL,
  supplier_id    VARCHAR(64) NOT NULL,
  supplier_maker VARCHAR(128),
  supplier_part_no VARCHAR(128) NOT NULL,
  moq            INTEGER,
  spq            INTEGER,
  stock          INTEGER,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (import_no, supplier_id, supplier_part_no)
);

-- 仕入先型番テーブル
CREATE TABLE supplier_part (
  supplier_id      VARCHAR(64) NOT NULL,
  supplier_maker   VARCHAR(128),
  supplier_part_no VARCHAR(128) NOT NULL,
  item_id          BIGINT,
  moq              INTEGER,
  spq              INTEGER,
  lead_time        INTEGER,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id, supplier_part_no)
);

-- 仕入先単価テーブル
CREATE TABLE supplier_price (
  supplier_id   VARCHAR(64) NOT NULL,
  item_id       BIGINT NOT NULL,
  quantity      INTEGER,
  price         DECIMAL(15,4),
  currency      VARCHAR(8),
  import_no     BIGINT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id, item_id, import_no)
);

-- 仕入先在庫テーブル
CREATE TABLE supplier_stock (
  supplier_id   VARCHAR(64) NOT NULL,
  item_id       BIGINT NOT NULL,
  stock         INTEGER,
  import_no     BIGINT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id, item_id, import_no)
);

-- 品目テーブル
CREATE TABLE item (
  item_id         BIGSERIAL PRIMARY KEY,
  stock           INTEGER,
  display_name    VARCHAR(128),
  model           VARCHAR(128),
  sales_price     DECIMAL(15,4),
  cost_price      DECIMAL(15,4),
  moq             INTEGER,
  spq             INTEGER,
  lead_time       INTEGER,
  supplier_stock  INTEGER,
  supplier_id     VARCHAR(64),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 品目詳細テーブル
CREATE TABLE item_detail (
  item_id         BIGINT NOT NULL,
  language_id     INTEGER NOT NULL,
  detail_url      VARCHAR(255),
  description     TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, language_id),
  FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE CASCADE
);

-- マッピングルールテーブル
CREATE TABLE mapping_rules (
  id            BIGSERIAL PRIMARY KEY,
  supplier      VARCHAR(64) NOT NULL,
  file_field    VARCHAR(64) NOT NULL,
  db_field      VARCHAR(64) NOT NULL,
  type          VARCHAR(16),
  condition     VARCHAR(64),
  fixed_value   VARCHAR(64),
  priority      INTEGER DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- エラーログテーブル
CREATE TABLE error_logs (
  id            BIGSERIAL PRIMARY KEY,
  import_no     BIGINT NOT NULL,
  row_no        INTEGER,
  field         VARCHAR(64),
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 取込管理テーブル（追加）
CREATE TABLE import_management (
  import_no     BIGSERIAL PRIMARY KEY,
  supplier      VARCHAR(64) NOT NULL,
  file_name     VARCHAR(255),
  file_type     VARCHAR(32),
  total_rows    INTEGER,
  success_rows  INTEGER,
  error_rows    INTEGER,
  status        VARCHAR(32) DEFAULT 'processing',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at  TIMESTAMP
);

-- ユーザーテーブル（認証用）
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  username      VARCHAR(64) UNIQUE NOT NULL,
  email         VARCHAR(128) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(32) DEFAULT 'user',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_chukan_file_tanka_import_no ON chukan_file_tanka(import_no);
CREATE INDEX idx_chukan_file_zaiko_import_no ON chukan_file_zaiko(import_no);
CREATE INDEX idx_supplier_part_item_id ON supplier_part(item_id);
CREATE INDEX idx_supplier_price_item_id ON supplier_price(item_id);
CREATE INDEX idx_supplier_stock_item_id ON supplier_stock(item_id);
CREATE INDEX idx_item_supplier_id ON item(supplier_id);
CREATE INDEX idx_mapping_rules_supplier ON mapping_rules(supplier);
CREATE INDEX idx_error_logs_import_no ON error_logs(import_no);
CREATE INDEX idx_import_management_supplier ON import_management(supplier);

-- 外部キー制約
ALTER TABLE supplier_part ADD CONSTRAINT fk_supplier_part_item_id 
  FOREIGN KEY (item_id) REFERENCES item(item_id);

ALTER TABLE supplier_price ADD CONSTRAINT fk_supplier_price_item_id 
  FOREIGN KEY (item_id) REFERENCES item(item_id);

ALTER TABLE supplier_stock ADD CONSTRAINT fk_supplier_stock_item_id 
  FOREIGN KEY (item_id) REFERENCES item(item_id);

-- トリガー関数（updated_atの自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガー設定
CREATE TRIGGER update_supplier_part_updated_at BEFORE UPDATE
    ON supplier_part FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_updated_at BEFORE UPDATE
    ON item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_detail_updated_at BEFORE UPDATE
    ON item_detail FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mapping_rules_updated_at BEFORE UPDATE
    ON mapping_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE
    ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();