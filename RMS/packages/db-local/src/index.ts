import Database from "@tauri-apps/plugin-sql";
export { generateId, recordOutboxEvent } from './outbox';

// Config helpers
export async function setConfig(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT OR REPLACE INTO config (key, value) VALUES ($1, $2)',
    [key, value]
  );
}

export async function getConfig(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT value FROM config WHERE key = $1', [key]);
  return rows.length > 0 ? rows[0].value : null;
}

let dbInstance: Database | null = null;
let isInitialized = false;

export async function getDb(): Promise<Database> {
  if (dbInstance && isInitialized) return dbInstance;

  // Если пытаемся запустить db в браузере (Google Chrome и тд), а не внутри окна Tauri
  if (typeof window !== 'undefined' && !(window as any).__TAURI_INTERNALS__) {
    throw new Error("⚠️ Ошибка: Ты открыл админку в Google Chrome/Safari по ссылке localhost:3000. Локальная SQLite база данных работает ТОЛЬКО внутри десктопного окна RMS AI OS (Tauri). Закрой вкладку браузера и открой отдельное окно приложения (оно в доке/таскбаре)!");
  }
  
  if (!dbInstance) {
    dbInstance = await Database.load("sqlite:rms_shop.db");
  }
  
  if (!isInitialized) {
    await initLocalDb(dbInstance);
    isInitialized = true;
  }

  return dbInstance;
}

async function initLocalDb(db: Database) {
  // Creates tables if they don't exist
  await db.execute(`
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
  `);

  // Отдельно добавляем новые колонки для старых БД (игнорируя ошибки, если уже есть)
  try { await db.execute(`ALTER TABLE inventory_items ADD COLUMN recipe_unit TEXT;`); } catch(e) { /* expected if exists */ }
  try { await db.execute(`ALTER TABLE inventory_items ADD COLUMN yield_per_unit REAL;`); } catch(e) { /* expected if exists */ }
  
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS inventory_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      is_visible_in_assemblies INTEGER DEFAULT 1,
      is_visible_in_recipe INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      low_stock_threshold_percent REAL DEFAULT 15,
      telegram_chat_id TEXT,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS menu_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT,
      name_he TEXT,
      name_uk TEXT,
      order_index INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      customer_phone TEXT,
      status TEXT DEFAULT 'new',
      total_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      is_archived INTEGER DEFAULT 0,
      reservation_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      portions INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      inventory_item_id TEXT,
      nested_recipe_id TEXT,
      quantity REAL DEFAULT 0,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  try { await db.execute(`ALTER TABLE recipe_ingredients ADD COLUMN nested_recipe_id TEXT;`); } catch(e) {}
  try { await db.execute(`ALTER TABLE recipe_ingredients MODIFY COLUMN inventory_item_id TEXT;`); } catch(e) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS assemblies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS assembly_items (
      id TEXT PRIMARY KEY,
      assembly_id TEXT NOT NULL,
      inventory_item_id TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      category TEXT,
      notes TEXT,
      hours TEXT,
      preferred_language TEXT,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS supplier_orders (
      id TEXT PRIMARY KEY,
      supplier_id TEXT,
      status TEXT DEFAULT 'draft',
      total_amount REAL DEFAULT 0,
      items TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending'
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
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
      is_developer_mode INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
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
  `);

  await db.execute(`
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
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      work_hours TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS supplier_products (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      image_url TEXT,
      notes TEXT,
      prices TEXT,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      ru TEXT,
      en TEXT,
      he TEXT,
      uk TEXT,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'worker',
      rate_per_hour REAL DEFAULT 0,
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      start_time DATETIME,
      end_time DATETIME,
      total_hours REAL DEFAULT 0,
      total_pay REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS cash_transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL DEFAULT 0,
      description TEXT,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      amount REAL DEFAULT 0,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS waste_logs (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_type TEXT,
      quantity REAL DEFAULT 0,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS stocktakes (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'draft',
      notes TEXT,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS stocktake_items (
      id TEXT PRIMARY KEY,
      stocktake_id TEXT NOT NULL,
      inventory_item_id TEXT NOT NULL,
      expected_stock REAL DEFAULT 0,
      actual_stock REAL DEFAULT 0,
      difference REAL DEFAULT 0,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS outbox_events (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      action TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try { await db.execute("ALTER TABLE outbox_events ADD COLUMN retry_count INTEGER DEFAULT 0;"); } catch(e) {}
  try { await db.execute("ALTER TABLE outbox_events ADD COLUMN last_error TEXT;"); } catch(e) {}

  try {
    await db.execute("ALTER TABLE ai_settings ADD COLUMN is_developer_mode INTEGER DEFAULT 0;");
  } catch (e) {
    // Ignore error if column already exists
  }

  try { await db.execute("ALTER TABLE recipes ADD COLUMN is_prep INTEGER DEFAULT 0;"); } catch(e) {}
  try { await db.execute("ALTER TABLE recipes ADD COLUMN prep_inventory_id TEXT;"); } catch(e) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      seats INTEGER DEFAULT 1,
      zone TEXT,
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'synced'
    );
  `);


  try { await db.execute("ALTER TABLE menu_items ADD COLUMN kitchen_department TEXT;"); } catch(e) {}
  try { await db.execute("ALTER TABLE menu_items ADD COLUMN is_prep INTEGER DEFAULT 0;"); } catch(e) {}
  try { await db.execute("ALTER TABLE menu_items ADD COLUMN unit TEXT;"); } catch(e) {}
  try { await db.execute("ALTER TABLE menu_items ADD COLUMN write_off_on_produce INTEGER DEFAULT 0;"); } catch(e) {}
}

// For testing or manual initialization if needed
export { initLocalDb };
