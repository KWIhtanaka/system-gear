-- Railway PostgreSQL 初期化スクリプト

-- 1. 関数作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. 中間ファイル単価テーブル
CREATE TABLE IF NOT EXISTS chukan_file_tanka (
  import_no BIGINT NOT NULL,
  import_date DATE NOT NULL,
  supplier_id VARCHAR(64) NOT NULL,
  supplier_maker VARCHAR(128),
  supplier_part_no VARCHAR(128) NOT NULL,
  quantity INTEGER,
  price DECIMAL(15,4),
  currency VARCHAR(8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (import_no, supplier_id, supplier_part_no)
);

-- 3. 中間ファイル在庫テーブル
CREATE TABLE IF NOT EXISTS chukan_file_zaiko (
  import_no BIGINT NOT NULL,
  import_date DATE NOT NULL,
  supplier_id VARCHAR(64) NOT NULL,
  supplier_maker VARCHAR(128),
  supplier_part_no VARCHAR(128) NOT NULL,
  moq INTEGER,
  spq INTEGER,
  stock INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (import_no, supplier_id, supplier_part_no)
);

-- 4. 仕入先型番テーブル
CREATE TABLE IF NOT EXISTS supplier_part (
  supplier_id VARCHAR(64) NOT NULL,
  supplier_maker VARCHAR(128),
  supplier_part_no VARCHAR(128) NOT NULL,
  item_id BIGINT,
  moq INTEGER,
  spq INTEGER,
  lead_time INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id, supplier_part_no)
);

-- 5. 仕入先単価テーブル
CREATE TABLE IF NOT EXISTS supplier_price (
  supplier_id VARCHAR(64) NOT NULL,
  item_id BIGINT NOT NULL,
  quantity INTEGER,
  price DECIMAL(15,4),
  currency VARCHAR(8),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id, item_id, quantity)
);

-- 6. 仕入先在庫テーブル
CREATE TABLE IF NOT EXISTS supplier_stock (
  supplier_id VARCHAR(64) NOT NULL,
  item_id BIGINT NOT NULL,
  stock_qty INTEGER,
  updated_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id, item_id)
);

-- 7. アイテムテーブル
CREATE TABLE IF NOT EXISTS item (
  item_id BIGSERIAL PRIMARY KEY,
  model VARCHAR(128) NOT NULL,
  name VARCHAR(255),
  supplier_id VARCHAR(64),
  jan_code VARCHAR(64),
  maker VARCHAR(128),
  status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. アイテム詳細テーブル
CREATE TABLE IF NOT EXISTS item_detail (
  item_id BIGINT NOT NULL,
  language_id INTEGER NOT NULL,
  name VARCHAR(255),
  description TEXT,
  spec TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, language_id)
);

-- 9. マッピングルールテーブル
CREATE TABLE IF NOT EXISTS mapping_rules (
  rule_id BIGSERIAL PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  rule_name VARCHAR(255),
  conditions JSONB,
  mapping JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. エラーログテーブル
CREATE TABLE IF NOT EXISTS error_logs (
  log_id BIGSERIAL PRIMARY KEY,
  import_no BIGINT,
  error_type VARCHAR(64),
  error_message TEXT,
  file_name VARCHAR(255),
  line_number INTEGER,
  raw_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. 取込管理テーブル
CREATE TABLE IF NOT EXISTS import_management (
  import_no BIGSERIAL PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  file_type VARCHAR(32),
  file_name VARCHAR(255),
  status VARCHAR(32),
  processed_count INTEGER,
  error_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_chukan_file_tanka_import_no ON chukan_file_tanka(import_no);
CREATE INDEX IF NOT EXISTS idx_chukan_file_zaiko_import_no ON chukan_file_zaiko(import_no);
CREATE INDEX IF NOT EXISTS idx_supplier_part_item_id ON supplier_part(item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_item_id ON supplier_price(item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_stock_item_id ON supplier_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_item_supplier_id ON item(supplier_id);
CREATE INDEX IF NOT EXISTS idx_mapping_rules_supplier ON mapping_rules(supplier_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_import_no ON error_logs(import_no);
CREATE INDEX IF NOT EXISTS idx_import_management_supplier ON import_management(supplier_id);

-- 外部キー制約
ALTER TABLE supplier_part ADD CONSTRAINT fk_supplier_part_item_id 
  FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE SET NULL;

ALTER TABLE supplier_price ADD CONSTRAINT fk_supplier_price_item_id 
  FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE CASCADE;

ALTER TABLE supplier_stock ADD CONSTRAINT fk_supplier_stock_item_id 
  FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE CASCADE;

-- トリガー作成
CREATE TRIGGER update_supplier_part_updated_at 
  BEFORE UPDATE ON supplier_part 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_item_updated_at 
  BEFORE UPDATE ON item 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_item_detail_updated_at 
  BEFORE UPDATE ON item_detail 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_mapping_rules_updated_at 
  BEFORE UPDATE ON mapping_rules 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 初期データ投入
INSERT INTO item (model, name, supplier_id, maker) VALUES
('MODEL-A001', 'サンプル商品A', 'supplier_a', 'メーカーA'),
('MODEL-B002', 'サンプル商品B', 'supplier_b', 'メーカーB')
ON CONFLICT DO NOTHING;

INSERT INTO item_detail (item_id, language_id, name, description) VALUES
(1, 1, 'サンプル商品A', '商品Aの詳細説明'),
(2, 1, 'サンプル商品B', '商品Bの詳細説明')
ON CONFLICT DO NOTHING;

-- 管理者ユーザー作成 (パスワード: admin123)
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@systemgear.com', '$2a$10$rQZ9cMhOFJqcVKoUQ4UKaOH4mw4xZzWm1qGJx9gKaX4tYhZNNO6V2', 'admin')
ON CONFLICT DO NOTHING;

-- 仕入先商品データ
INSERT INTO supplier_part (supplier_id, supplier_part_no, item_id, moq, spq, lead_time) VALUES
('supplier_a', 'PART-A001', 1, 10, 1, 7),
('supplier_b', 'PART-B002', 2, 5, 1, 14)
ON CONFLICT DO NOTHING;

-- 単価データ
INSERT INTO supplier_price (supplier_id, item_id, quantity, price, currency) VALUES
('supplier_a', 1, 1, 1500.0000, 'JPY'),
('supplier_b', 2, 1, 2500.0000, 'JPY')
ON CONFLICT DO NOTHING;

-- 在庫データ  
INSERT INTO supplier_stock (supplier_id, item_id, stock_qty, updated_date) VALUES
('supplier_a', 1, 100, CURRENT_DATE),
('supplier_b', 2, 50, CURRENT_DATE)
ON CONFLICT DO NOTHING;