-- 初期データ投入SQL

-- 管理者ユーザー作成（パスワード: admin123）
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@systemgear.com', '$2b$10$rQZ8qZ8qZ8qZ8qZ8qZ8qZe', 'admin'),
('user01', 'user01@systemgear.com', '$2b$10$rQZ8qZ8qZ8qZ8qZ8qZ8qZe', 'user');

-- サンプル仕入先用マッピングルール
INSERT INTO mapping_rules (supplier, file_field, db_field, type, condition, priority) VALUES
-- 仕入先A用
('supplier_a', 'part_number', 'supplier_part_no', 'string', '', 1),
('supplier_a', 'maker_name', 'supplier_maker', 'string', '', 2),
('supplier_a', 'stock_qty', 'stock', 'integer', '', 3),
('supplier_a', 'unit_price', 'price', 'decimal', '', 4),
('supplier_a', 'min_order', 'moq', 'integer', '', 5),
('supplier_a', 'package_qty', 'spq', 'integer', '', 6),

-- 仕入先B用
('supplier_b', 'model_no', 'supplier_part_no', 'string', '', 1),
('supplier_b', 'manufacturer', 'supplier_maker', 'string', '', 2),
('supplier_b', 'inventory', 'stock', 'integer', '', 3),
('supplier_b', 'price_yen', 'price', 'decimal', '', 4),
('supplier_b', 'minimum_qty', 'moq', 'integer', '', 5);

-- サンプル品目データ
INSERT INTO item (display_name, model, sales_price, cost_price, moq, spq, lead_time, supplier_stock, supplier_id) VALUES
('サンプル商品A', 'MODEL-A001', 1500.00, 1000.00, 10, 1, 7, 100, 'supplier_a'),
('サンプル商品B', 'MODEL-B002', 2500.00, 1800.00, 5, 1, 14, 50, 'supplier_b');

-- サンプル品目詳細（日本語）
INSERT INTO item_detail (item_id, language_id, detail_url, description) VALUES
(1, 1, 'https://example.com/detail/1', 'サンプル商品Aの詳細説明です。'),
(2, 1, 'https://example.com/detail/2', 'サンプル商品Bの詳細説明です。');

-- サンプル仕入先型番データ
INSERT INTO supplier_part (supplier_id, supplier_maker, supplier_part_no, item_id, moq, spq, lead_time) VALUES
('supplier_a', 'メーカーA', 'PART-A001', 1, 10, 1, 7),
('supplier_b', 'メーカーB', 'PART-B002', 2, 5, 1, 14);

-- サンプル取込管理データ
INSERT INTO import_management (supplier, file_name, file_type, total_rows, success_rows, error_rows, status, completed_at) VALUES
('supplier_a', 'stock_data_20241126.csv', 'stock', 100, 95, 5, 'completed', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('supplier_b', 'price_data_20241126.csv', 'price', 200, 198, 2, 'completed', CURRENT_TIMESTAMP - INTERVAL '2 hours');