## 環境

| メモリー | 4GB |
| ストレージ | 100GB |
|  |
| 環境 | MySQL | 5.1.73-8 |
| php | 5.3.3-50 |

## products

| テーブル名 | products | 必須 |
|  |
| 属性 | カラム | 型 | 主キー | 照合順序 | ヌル(NULL) | デフォルト値 | その他 |
| 品目ID | products_id | int(11) | 1 | いいえ | auto_increment |
| 在庫数 | products_quantity | int(4) | いいえ | 0 |
| 表示用品名 | products_model | varchar(64) | ujis_japanese_ci | はい |
| 型式 | products_model_s | varchar(64) | ujis_japanese_ci | はい |
| 関連品取得用型式 | products_model_op | varchar(64) | ujis_japanese_ci | はい |
| 梱包単位違型式 | products_qty | varchar(64) | ujis_japanese_ci | はい |
| 画像 | products_image | varchar(64) | ujis_japanese_ci | はい |
| 販売単価 | products_price | decimal(15,4) | はい | 0 |
| 原価単価 | products_cost | decimal(15,4) | はい | 0 |
| 送料 | products_shipping | decimal(15,4) | はい | 0 |
| 追加日時 | products_date_added | datetime | はい |
| 更新日時 | products_last_modified | datetime | はい |
| 販売中止日時 | products_date_available | datetime | はい |
| 重量（未使用） | products_weight | decimal(5,2) | はい | 0 |
| 停止フラグ | products_status | tinyint(1) | 3 | いいえ | 0 |
| 消費税設定 | products_tax_class_id | tinyint(11) | いいえ | 0 |
| メーカーID | manufacturers_id | int(11) | はい |
| 受注件数 | products_ordered | int(11) | いいえ | 0 |
| 納期 | products_delivery | int(2) | いいえ | 0 |
| 標準納期 | products_delivery_normal | int(2) | いいえ | 0 |
| カテゴリーID | categories_id | int(11) | いいえ | 0 |
| 分類名 | products_name | varchar(64) | ujis_japanese_ci | はい |
| 言語ID | language_id | int(11) | 2 | いいえ | 1 |
| 海外サイト表示 | products_net | tinyint(1) | いいえ | 0 |
| 生産中止フラグ | discontinued | tinyint(1) | いいえ | 0 |
| 鉛フリー | pb | tinyint(1) | いいえ | 0 |
| MOQ | products_min | int(11) | いいえ | 1 |
| SPQ | products_lot | int(11) | いいえ | 1 |
| 限定在庫数 | limited_stock | tinyint(1) | いいえ | 0 |
| 単位 | unit | varchar(10) | ujis_japanese_ci | いいえ |
| 入数 | per_case | float | いいえ |
| 入数単位 | unit_pcs | varchar(10) | ujis_japanese_ci | いいえ |
| 詳細ページ品種 | products_title | varchar(64) | ujis_japanese_ci | いいえ |
| シーリーズ名 | series | varchar(64) | ujis_japanese_ci | いいえ |
| 親品番フラグ | parent_item | int(2) | いいえ | 0 |
| 梱包形態違フラグ | packing | int(2) | いいえ | 0 |
| 正規流通品フラグ | channel | int(2) | いいえ | 0 |
| 親品番 | parent_id | int(11) | いいえ |
| 納期修正日時 | delivery_last_modified | datetime | はい |
| 仕入先在庫数 | vendor_quantity | int(4) | いいえ | 0 |
| 仕入先ID | vendor_id | int(11) | はい |
| テープカット品 | tape_cutting | tinyint(1) | いいえ | 0 |
| 委託販売 | consignment_sale | tinyint(1) | いいえ | 0 |
| 在庫種別 | stock_type | tinyint(1) | いいえ | 0 |
| 旧生管システムコード | tpics | varchar(25) | ujis_japanese_ci | いいえ |

## products_description

| テーブル名 | products_description | 必須 |
|  |
| 属性 | カラム | 型 | 主キー | 照合順序 | ヌル(NULL) | デフォルト値 | その他 |
| 品目ID | products_id | int(11) | 1 | いいえ | auto_increment |
| 言語ID | language_id | int(11) | いいえ | 1 |
| 詳細ページ品種URL | products_name | varchar(255) | ujis_japanese_ci | いいえ |
| 説明 | products_description | text | ujis_japanese_ci | はい |
| 詳細ページメーカーURL | products_url | varchar(255) | ujis_japanese_ci | はい |
| ページ表示回数 | products_viewed | int(5) | はい | 0 |
| 表示日時 | last_viewed | varchar(20) | ujis_japanese_ci | いいえ |
| 表示先IP | viewed_ip | varchar(39) | ujis_japanese_ci | いいえ |
| 表示先HOST | host_user | varchar(256) | ujis_japanese_ci | はい |
| シリーズURL | products_pdf | varchar(255) | ujis_japanese_ci | はい |
| カタログURL | catalog | varchar(255) | ujis_japanese_ci | はい |
| 仕様書URL | specification | varchar(255) | ujis_japanese_ci | はい |
| ボットIP | ip | varchar(15) | ujis_japanese_ci | いいえ |
| ボットHOST | host | varchar(256) | ujis_japanese_ci | はい |
| ボットクロール回数 | bot_viewed | int(5) | いいえ |
| ボットクロール日時 | last_bot | varchar(20) | ujis_japanese_ci | いいえ |
| bing IP | ip_bing | varchar(15) | ujis_japanese_ci | いいえ |
| bing HOST | host_bing | varchar(255) | ujis_japanese_ci | はい |
| bingクロール回数 | bot_viewed_bing | int(5) | いいえ |
| bingクロール日時 | last_bot_bing | varchar(20) | ujis_japanese_ci | いいえ |

## categories_description

| テーブル名 | categories_description | 必須 |
|  |
| 属性 | カラム | 型 | 主キー | 照合順序 | ヌル(NULL) | デフォルト値 | その他 |
| カテゴリーID | categories_id | int(11) | 1 | いいえ | 0 |
| 言語ID | language_id | int(11) | 2 | いいえ | 1 |
| 名称 | categories_name | varchar(32) | ujis_japanese_ci | いいえ |
| カテゴリーURL | c_url | varchar(64) | ujis_japanese_ci | はい |
| 削除フラグ | c_status | int(1) | いいえ | 0 |

## manufacturers

| テーブル名 | manufacturers | 必須 |
|  |
| 属性 | カラム | 型 | 主キー | 照合順序 | ヌル(NULL) | デフォルト値 | その他 |
| メーカーID | manufacturers_id | int(11) | 1 | いいえ | auto_increment |
| 名称 | manufacturers_name | varchar(64) | ujis_japanese_ci | いいえ |
| 英語名 | manufacturers_en | varchar(64) | ujis_japanese_ci | はい |
| フリガナ | manufacturers_kana | varchar(128) | ujis_japanese_ci | はい |
| イメージ（未使用） | manufacturers_image | varchar(64) | ujis_japanese_ci | はい |
| メーカーページURL | m_url | varchar(64) | ujis_japanese_ci | はい |
| 登録日時 | date_added | datetime | はい |
| 変更日時 | last_modified | datetime | はい |
| 削除フラグ | m_status | tinyint(1) | いいえ | 0 |
| コメント | comment | varchar(120) | ujis_japanese_ci | はい |

## manufacturers_list

| テーブル名 | manufacturers_list | 必須 |
|  |
| 属性 | フィールド | 種別 | 主キー | 照合順序 | ヌル(NULL) | デフォルト値 | その他 |
| 先頭 | sort | varchar(1) | ujis_japanese_ci | はい | アカサタナハマヤラワ |
| フリガナ | manufacturers_kana | varchar(128) | ujis_japanese_ci | はい |
| 日本名 | manufacturers_name_jp | varchar(64) | ujis_japanese_ci | いいえ |
| 英語名 | manufacturers_name_en | varchar(64) | ujis_japanese_ci | いいえ |
| メーカーID | manufacturers_id | int(11) | いいえ | 0 |

## manufacturers_status

| テーブル名 | manufacturers_status | 必須 |
|  |
| 属性 | フィールド | 種別 | 主キー | 照合順序 | ヌル(NULL) | デフォルト値 | その他 |
| メーカーID | manufacturers_id | int(11) | いいえ | 0 |
| 削除フラグ | m_status | int(1) | いいえ | 0 |

