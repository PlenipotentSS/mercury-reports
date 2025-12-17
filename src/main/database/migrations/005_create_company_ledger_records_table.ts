import type { Database } from 'better-sqlite3'

export function up(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_ledger_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE(company_id, key)
    );

    CREATE INDEX idx_company_ledger_records_company_id ON company_ledger_records(company_id);
    CREATE INDEX idx_company_ledger_records_key ON company_ledger_records(key);
  `)
}

export function down(db: Database): void {
  db.exec(`
    DROP INDEX IF EXISTS idx_company_ledger_records_key;
    DROP INDEX IF EXISTS idx_company_ledger_records_company_id;
    DROP TABLE IF EXISTS company_ledger_records;
  `)
}
