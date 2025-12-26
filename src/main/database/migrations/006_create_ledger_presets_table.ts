import type { Database } from 'better-sqlite3'

export function up(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ledger_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_ledger_presets_key ON ledger_presets(key);
  `)

  // Insert default ledger presets
  const stmt = db.prepare(`
    INSERT INTO ledger_presets (key, label, description)
    VALUES (?, ?, ?)
  `)

  stmt.run(
    'gl_name_mercury_checking',
    'GL Name Mercury Checking',
    'General ledger name for Mercury checking account transactions'
  )
  stmt.run(
    'gl_name_mercury_credit_card',
    'GL Name Mercury Credit Card',
    'General ledger name for Mercury credit card transactions'
  )
}

export function down(db: Database): void {
  db.exec(`
    DROP INDEX IF EXISTS idx_ledger_presets_key;
    DROP TABLE IF EXISTS ledger_presets;
  `)
}
