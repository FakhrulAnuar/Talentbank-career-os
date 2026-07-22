// Idempotent table creation. Called by both the seed script and the server on boot,
// so the API can stand up a fresh SQLite file without a separate migration step.
import { sqlite } from './client.js';

// Add a column only if it doesn't already exist (poor-man's ALTER migration for SQLite,
// which - unlike CREATE TABLE IF NOT EXISTS - has no idempotent ADD COLUMN).
function ensureColumn(table, column, definition) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function ensureSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      path_type TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      path_type TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      phase TEXT NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id INTEGER NOT NULL,
      milestone_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'preview',
      points_awarded INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      PRIMARY KEY (user_id, milestone_id)
    );
    CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      path_type TEXT NOT NULL,
      title TEXT NOT NULL,
      phase TEXT NOT NULL,
      description TEXT NOT NULL,
      cv_tip TEXT,
      minutes INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      provider TEXT,
      url TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      last_verified TEXT,
      tags TEXT,
      always_show INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS user_modules (
      user_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      completed_at INTEGER,
      PRIMARY KEY (user_id, module_id)
    );
    CREATE INDEX IF NOT EXISTS idx_usermodules_user ON user_modules(user_id);
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      milestone_id INTEGER,
      title TEXT NOT NULL,
      issuer TEXT NOT NULL,
      file_ref TEXT,
      issued_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS resumes (
      user_id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY,
      target_field TEXT,
      interests TEXT,
      bio TEXT,
      location TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      field TEXT NOT NULL,
      location TEXT,
      blurb TEXT,
      tags TEXT,
      source_url TEXT,
      last_verified TEXT
    );
    CREATE TABLE IF NOT EXISTS job_signals (
      field TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      top_skills TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rec_explanations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_key TEXT NOT NULL,
      input_hash TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_recexpl_lookup ON rec_explanations(user_id, target_key, input_hash);
    CREATE TABLE IF NOT EXISTS course_guidance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      input_hash TEXT NOT NULL,
      order_json TEXT,
      note TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_guidance_lookup ON course_guidance(user_id, input_hash);
    CREATE TABLE IF NOT EXISTS internships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      company TEXT NOT NULL,
      role TEXT,
      field TEXT,
      location TEXT,
      state TEXT,
      mode TEXT,
      duration TEXT,
      paid TEXT,
      blurb TEXT,
      requirements TEXT,
      deadline TEXT,
      url TEXT,
      tags TEXT,
      always_show INTEGER NOT NULL DEFAULT 0,
      last_verified TEXT
    );
    CREATE TABLE IF NOT EXISTS internship_guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      internship_key TEXT NOT NULL,
      input_hash TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_intguide_lookup ON internship_guides(user_id, internship_key, input_hash);
    CREATE TABLE IF NOT EXISTS scholarships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      provider TEXT,
      type TEXT,
      award TEXT,
      stage TEXT,
      field TEXT,
      benefit TEXT,
      requirements TEXT,
      deadline TEXT,
      scope TEXT,
      state TEXT,
      url TEXT,
      tags TEXT,
      always_show INTEGER NOT NULL DEFAULT 0,
      last_verified TEXT
    );
    CREATE TABLE IF NOT EXISTS scholarship_guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      scholarship_key TEXT NOT NULL,
      input_hash TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_schguide_lookup ON scholarship_guides(user_id, scholarship_key, input_hash);
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      path_type TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      organizer TEXT,
      date TEXT,
      deadline TEXT,
      location TEXT,
      mode TEXT,
      cost TEXT,
      blurb TEXT,
      url TEXT,
      tags TEXT,
      always_show INTEGER NOT NULL DEFAULT 0,
      last_verified TEXT
    );
  `);

  // Migrate existing module tables created before the real-catalog fields existed.
  ensureColumn('modules', 'provider', 'TEXT');
  ensureColumn('modules', 'url', 'TEXT');
  ensureColumn('modules', 'verified', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('modules', 'last_verified', 'TEXT');
  ensureColumn('modules', 'tags', 'TEXT');
  ensureColumn('modules', 'always_show', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('certificates', 'verified', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('certificates', 'verify_source', 'TEXT');
  ensureColumn('modules', 'level', 'TEXT');
  ensureColumn('profiles', 'year_level', 'TEXT');
  ensureColumn('profiles', 'state', 'TEXT');
  ensureColumn('targets', 'scope', 'TEXT');
  ensureColumn('targets', 'state', 'TEXT');
}
