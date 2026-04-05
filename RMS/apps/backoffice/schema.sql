CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT,
  unit TEXT,
  price REAL DEFAULT 0,
  stock REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,
  supplier TEXT,
  pack_size REAL DEFAULT 1,
  image_data TEXT,
  recipe_unit TEXT,
  yield_per_unit REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS inventory_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_visible_in_assemblies INTEGER DEFAULT 1,
  is_visible_in_recipe INTEGER DEFAULT 1,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  low_stock_threshold_percent REAL DEFAULT 15,
  telegram_chat_id TEXT,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  name_he TEXT,
  name_uk TEXT,
  order_index INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  name_he TEXT,
  name_uk TEXT,
  price REAL DEFAULT 0,
  description TEXT,
  description_en TEXT,
  description_he TEXT,
  description_uk TEXT,
  stock REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  image_url TEXT,
  is_poll INTEGER DEFAULT 0,
  recipe_id TEXT,
  assembly_id TEXT,
  category_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  telegram_chat_id TEXT,
  status TEXT DEFAULT 'new',
  total_amount REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  is_archived INTEGER DEFAULT 0,
  reservation_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  menu_item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  price_at_time REAL DEFAULT 0,
  menu_item_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  portions INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  inventory_item_id TEXT NOT NULL,
  quantity REAL DEFAULT 0,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS assemblies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS assembly_items (
  id TEXT PRIMARY KEY,
  assembly_id TEXT NOT NULL,
  inventory_item_id TEXT NOT NULL,
  quantity REAL DEFAULT 0,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS landing_settings (
  id TEXT PRIMARY KEY,
  hero_title TEXT,
  hero_title_en TEXT,
  hero_title_he TEXT,
  hero_title_uk TEXT,
  hero_subtitle TEXT,
  hero_subtitle_en TEXT,
  hero_subtitle_he TEXT,
  hero_subtitle_uk TEXT,
  about_text TEXT,
  about_text_en TEXT,
  about_text_he TEXT,
  about_text_uk TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  address_en TEXT,
  address_he TEXT,
  address_uk TEXT,
  working_hours TEXT,
  working_hours_en TEXT,
  working_hours_he TEXT,
  working_hours_uk TEXT,
  is_pickup_enabled INTEGER DEFAULT 1,
  is_delivery_enabled INTEGER DEFAULT 1,
  is_preorder_mode INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS ai_settings (
  id TEXT PRIMARY KEY,
  provider TEXT DEFAULT 'gemini',
  model_name TEXT,
  api_key TEXT,
  base_url TEXT,
  prompt_base TEXT,
  prompt_custom TEXT,
  prompt_forbidden TEXT,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  last_order_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS history_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT,
  budget REAL DEFAULT 0,
  spent REAL DEFAULT 0,
  start_date DATETIME,
  end_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  work_hours TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS supplier_products (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  image_url TEXT,
  notes TEXT,
  prices TEXT,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS supplier_orders (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  status TEXT,
  sent_via TEXT,
  total_amount REAL DEFAULT 0,
  items TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  ru TEXT,
  en TEXT,
  he TEXT,
  uk TEXT,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  rate_per_hour REAL DEFAULT 0,
  phone TEXT,
  status TEXT DEFAULT 'активный',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  status TEXT DEFAULT 'открыта',
  total_hours REAL DEFAULT 0,
  total_pay REAL DEFAULT 0,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_url TEXT,
  entity_type TEXT,
  entity_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS waste_logs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'inventory' or 'menu'
  quantity REAL NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS stocktakes (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'draft', -- 'draft', 'completed'
  notes TEXT,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS stocktake_items (
  id TEXT PRIMARY KEY,
  stocktake_id TEXT NOT NULL,
  inventory_item_id TEXT NOT NULL,
  expected_stock REAL DEFAULT 0,
  actual_stock REAL DEFAULT 0,
  difference REAL DEFAULT 0,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
