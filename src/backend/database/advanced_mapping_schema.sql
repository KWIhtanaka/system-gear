-- 高度なマッピングルール用テーブル
CREATE TABLE IF NOT EXISTS advanced_mapping_rules (
    id SERIAL PRIMARY KEY,
    supplier VARCHAR(64) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'value_mapping', 'conditional_skip', 'calculation', 'text_transform'
    source_field VARCHAR(255),
    target_field VARCHAR(255),
    conditions JSONB NOT NULL, -- ルール固有の条件設定
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_advanced_mapping_rules_supplier 
ON advanced_mapping_rules(supplier);

CREATE INDEX IF NOT EXISTS idx_advanced_mapping_rules_active 
ON advanced_mapping_rules(supplier, is_active);

-- サンプルデータ投入
INSERT INTO advanced_mapping_rules (supplier, rule_name, rule_type, source_field, target_field, conditions, priority) VALUES
-- メーカー名統一マッピング（仕入先A）
('supplier_a', 'メーカー名統一', 'value_mapping', 'maker_name', 'supplier_maker', '[
    {"from_value": "SONY", "to_value": "ソニー", "match_type": "exact"},
    {"from_value": "PANASONIC", "to_value": "パナソニック", "match_type": "exact"},
    {"from_value": "HITACHI", "to_value": "日立", "match_type": "exact"},
    {"from_value": "TOSHIBA", "to_value": "東芝", "match_type": "exact"},
    {"from_value": "NEC", "to_value": "日本電気", "match_type": "exact"}
]', 1),

-- 在庫ゼロのデータをスキップ
('supplier_a', '在庫ゼロスキップ', 'conditional_skip', '', '', '[
    {"field": "stock_qty", "operator": "equals", "value": "0"},
    {"field": "stock_qty", "operator": "equals", "value": "", "logic_operator": "OR"}
]', 2),

-- 価格計算（USD→JPY変換）
('supplier_a', 'USD価格変換', 'calculation', 'unit_price_usd', 'price', '[
    {"formula": "unit_price_usd * 150", "variables": ["unit_price_usd"]}
]', 3),

-- 型番正規化
('supplier_a', '型番正規化', 'text_transform', 'part_number', 'supplier_part_no', '[
    {"transform_type": "custom", "parameters": {"type": "normalize_part_number"}}
]', 4),

-- 仕入先B用のサンプル
('supplier_b', 'ブランド名統一', 'value_mapping', 'brand', 'supplier_maker', '[
    {"from_value": "Apple Inc.", "to_value": "アップル", "match_type": "exact"},
    {"from_value": "Microsoft Corp.", "to_value": "マイクロソフト", "match_type": "exact"},
    {"from_value": "Google LLC", "to_value": "グーグル", "match_type": "exact"}
]', 1),

-- 廃番商品をスキップ
('supplier_b', '廃番商品スキップ', 'conditional_skip', '', '', '[
    {"field": "status", "operator": "equals", "value": "discontinued"},
    {"field": "status", "operator": "equals", "value": "obsolete", "logic_operator": "OR"}
]', 2),

-- 在庫状況テキスト変換
('supplier_b', '在庫状況変換', 'value_mapping', 'inventory_status', 'stock', '[
    {"from_value": "In Stock", "to_value": "999", "match_type": "exact"},
    {"from_value": "Low Stock", "to_value": "10", "match_type": "exact"},
    {"from_value": "Out of Stock", "to_value": "0", "match_type": "exact"},
    {"from_value": "On Order", "to_value": "5", "match_type": "exact"}
]', 3);