import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'sellia.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    runMigrations(_db);
  }
  return _db;
}

function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'Admin',
      avatar_url TEXT,
      timezone TEXT NOT NULL DEFAULT 'America/Santiago',
      language TEXT NOT NULL DEFAULT 'es',
      date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
      currency TEXT NOT NULL DEFAULT 'USD',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      channel TEXT NOT NULL DEFAULT 'WhatsApp',
      status TEXT NOT NULL DEFAULT 'Nuevo',
      score INTEGER NOT NULL DEFAULT 0,
      human_mode INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lead_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lead_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER UNIQUE NOT NULL,
      demographics TEXT NOT NULL DEFAULT 'Sin datos suficientes',
      interests TEXT NOT NULL DEFAULT '[]',
      pain_points TEXT NOT NULL DEFAULT '[]',
      needs TEXT NOT NULL DEFAULT '[]',
      opportunities TEXT NOT NULL DEFAULT '[]',
      buying_intent TEXT NOT NULL DEFAULT 'Desconocida',
      platform_params TEXT NOT NULL DEFAULT '{"meta":"","google":"","linkedin":""}',
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'Meta Ads',
      status TEXT NOT NULL DEFAULT 'Active',
      spend REAL NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      reach INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      conversions INTEGER NOT NULL DEFAULT 0,
      roas REAL NOT NULL DEFAULT 0,
      cpa REAL NOT NULL DEFAULT 0,
      ctr REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS automations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Activo',
      runs INTEGER NOT NULL DEFAULT 0,
      flow_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'message',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

  `);

  // Add agent_name to knowledge_base if it doesn't exist yet
  const cols = db.prepare("PRAGMA table_info(knowledge_base)").all() as any[];
  if (!cols.find((c: any) => c.name === 'agent_name')) {
    db.exec("ALTER TABLE knowledge_base ADD COLUMN agent_name TEXT NOT NULL DEFAULT 'Agente IA'");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'disconnected',
      icon TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      config TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ad_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ad_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      metric TEXT NOT NULL,
      condition TEXT NOT NULL,
      value TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'Normal',
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Ventas',
      status TEXT NOT NULL DEFAULT 'Invitado',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      action_color TEXT NOT NULL DEFAULT 'blue',
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      last_used TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_prefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      new_leads_email INTEGER NOT NULL DEFAULT 1,
      daily_summary INTEGER NOT NULL DEFAULT 1,
      billing_alerts INTEGER NOT NULL DEFAULT 1,
      push_notifications INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_features (
      user_id INTEGER PRIMARY KEY,
      has_dashboard INTEGER NOT NULL DEFAULT 1,
      has_chats INTEGER NOT NULL DEFAULT 1,
      has_flows INTEGER NOT NULL DEFAULT 1,
      has_ads INTEGER NOT NULL DEFAULT 1,
      has_integrations INTEGER NOT NULL DEFAULT 1,
      has_settings INTEGER NOT NULL DEFAULT 1,
      plan TEXT NOT NULL DEFAULT 'Básico',
      is_active INTEGER NOT NULL DEFAULT 1,
      gemini_api_key TEXT,
      openai_api_key TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS whatsapp_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      phone_number_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      business_account_id TEXT NOT NULL DEFAULT '',
      display_name TEXT NOT NULL DEFAULT '',
      verify_token TEXT NOT NULL DEFAULT 'sellia_wh_verify',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      start_datetime TEXT NOT NULL,
      end_datetime TEXT NOT NULL,
      all_day INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'meeting',
      color TEXT NOT NULL DEFAULT '#6366f1',
      lead_id INTEGER,
      google_event_id TEXT,
      location TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS google_calendar_tokens (
      user_id INTEGER PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL DEFAULT '',
      expiry_date TEXT NOT NULL DEFAULT '',
      calendar_id TEXT NOT NULL DEFAULT 'primary',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id);
    CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
    CREATE INDEX IF NOT EXISTS idx_campaigns_date ON campaigns(date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    CREATE INDEX IF NOT EXISTS idx_automations_user ON automations(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_datetime);
  `);

  // Migrate existing DBs: add columns if not present
  try { db.exec('ALTER TABLE user_features ADD COLUMN gemini_api_key TEXT'); } catch (_) {}
  try { db.exec('ALTER TABLE user_features ADD COLUMN openai_api_key TEXT'); } catch (_) {}
  try { db.exec('ALTER TABLE leads ADD COLUMN phone_number TEXT'); } catch (_) {}
  try { db.exec('ALTER TABLE leads ADD COLUMN wa_message_id TEXT'); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN updated_at TEXT"); } catch (_) {}
  try { db.exec("UPDATE leads SET updated_at = created_at WHERE updated_at IS NULL"); } catch (_) {}
  try { db.exec('ALTER TABLE calendar_events ADD COLUMN location TEXT NOT NULL DEFAULT ""'); } catch (_) {}
  try { db.exec('ALTER TABLE calendar_events ADD COLUMN google_event_id TEXT'); } catch (_) {}
  try { db.exec("ALTER TABLE messages ADD COLUMN source TEXT NOT NULL DEFAULT 'bot'"); } catch (_) {}
  try { db.exec("ALTER TABLE messages ADD COLUMN wa_message_id TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE messages ADD COLUMN wa_status TEXT NOT NULL DEFAULT 'sent'"); } catch (_) {}

  // Lead email field migration
  try { db.exec('ALTER TABLE leads ADD COLUMN email TEXT'); } catch (_) {}

  // Collection AI prompt per user (stored in knowledge_base for simplicity)
  try { db.exec("ALTER TABLE knowledge_base ADD COLUMN collection_prompt TEXT NOT NULL DEFAULT ''"); } catch (_) {}

  // Missing updated_at columns in whatsapp_configs and knowledge_base
  try { db.exec("ALTER TABLE whatsapp_configs ADD COLUMN updated_at TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE knowledge_base ADD COLUMN updated_at TEXT"); } catch (_) {}

  // SMTP & notification preferences migrations
  try { db.exec("ALTER TABLE notification_prefs ADD COLUMN booking_email INTEGER NOT NULL DEFAULT 1"); } catch (_) {}
  try { db.exec("ALTER TABLE notification_prefs ADD COLUMN sale_email INTEGER NOT NULL DEFAULT 1"); } catch (_) {}
  try { db.exec("ALTER TABLE notification_prefs ADD COLUMN notify_email TEXT NOT NULL DEFAULT ''"); } catch (_) {}

  // Seed default SMTP global_settings keys (empty = not configured)
  const smtpKeys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'smtp_from_name', 'smtp_from_email', 'smtp_enabled'];
  const insertSetting = db.prepare("INSERT OR IGNORE INTO global_settings (key, value) VALUES (?, '')");
  for (const k of smtpKeys) insertSetting.run(k);

  // Collections / Cobranza Automatizada
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lead_id INTEGER,
      name TEXT NOT NULL,
      debtor_name TEXT NOT NULL,
      debtor_phone TEXT NOT NULL DEFAULT '',
      total_amount REAL NOT NULL DEFAULT 0,
      installments_count INTEGER NOT NULL DEFAULT 1,
      payment_link TEXT NOT NULL DEFAULT '',
      bank_info TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payment_installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      installment_number INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      paid_at TEXT,
      FOREIGN KEY (plan_id) REFERENCES payment_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS collection_messages_sent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      installment_id INTEGER NOT NULL,
      message_type TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (installment_id) REFERENCES payment_installments(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payment_plans_user ON payment_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_installments_plan ON payment_installments(plan_id);
    CREATE INDEX IF NOT EXISTS idx_collection_messages_installment ON collection_messages_sent(installment_id);
  `);

  seedSuperAdmin(db);
}

function seedSuperAdmin(db: Database.Database) {
  const existing = db.prepare("SELECT id FROM users WHERE email = 'admin@sellia.com'").get();
  if (existing) return;

  const hash = bcrypt.hashSync('Sellia2024!', 10);
  const result = db.prepare(
    "INSERT INTO users (email, password_hash, name, company, role) VALUES (?, ?, ?, ?, ?)"
  ).run('admin@sellia.com', hash, 'Super Admin', 'Sellia', 'superadmin');

  const adminId = result.lastInsertRowid as number;
  db.prepare('INSERT INTO user_features (user_id, plan) VALUES (?, ?)').run(adminId, 'Enterprise');
}

export function seedIntegrations(userId: number) {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as count FROM integrations WHERE user_id = ?').get(userId) as any;
  if (existing.count > 0) return;

  const integrations = [
    { name: 'WhatsApp Business API', category: 'Canales', status: 'connected', icon: '💬', desc: 'Conecta tu número oficial de WhatsApp.' },
    { name: 'Instagram Direct', category: 'Canales', status: 'connected', icon: '📸', desc: 'Automatiza respuestas en Instagram.' },
    { name: 'Facebook Messenger', category: 'Canales', status: 'connected', icon: '📘', desc: 'Atiende clientes desde tu Fanpage.' },
    { name: 'HubSpot CRM', category: 'CRM', status: 'disconnected', icon: '🟧', desc: 'Sincroniza leads y actividades.' },
    { name: 'Salesforce', category: 'CRM', status: 'disconnected', icon: '☁️', desc: 'Integración bidireccional de datos.' },
    { name: 'Stripe', category: 'Pagos', status: 'disconnected', icon: '💳', desc: 'Procesa pagos directamente en el chat.' },
    { name: 'Google Calendar', category: 'Productividad', status: 'connected', icon: '📅', desc: 'Permite a los leads agendar citas.' },
    { name: 'Meta Ads', category: 'Marketing', status: 'connected', icon: '🎯', desc: 'Sincroniza audiencias y conversiones.' },
    { name: 'Google Ads', category: 'Marketing', status: 'disconnected', icon: '🔍', desc: 'Optimiza campañas con datos offline.' },
  ];

  const stmt = db.prepare('INSERT INTO integrations (user_id, name, category, status, icon, description) VALUES (?, ?, ?, ?, ?, ?)');
  const insertMany = db.transaction((items: typeof integrations) => {
    for (const i of items) {
      stmt.run(userId, i.name, i.category, i.status, i.icon, i.desc);
    }
  });
  
  insertMany(integrations);
}
