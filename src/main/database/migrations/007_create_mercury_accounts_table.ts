import type { Database } from 'better-sqlite3'

export function up(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mercury_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      external_id TEXT NOT NULL,
      name TEXT NOT NULL,
      nickname TEXT,
      dashboard_link TEXT,
      status TEXT,
      account_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE(company_id, external_id)
    );

    CREATE INDEX idx_mercury_accounts_company_id ON mercury_accounts(company_id);
    CREATE INDEX idx_mercury_accounts_external_id ON mercury_accounts(external_id);
  `)
}

export function down(db: Database): void {
  db.exec(`
    DROP INDEX IF EXISTS idx_mercury_accounts_external_id;
    DROP INDEX IF EXISTS idx_mercury_accounts_company_id;
    DROP TABLE IF EXISTS mercury_accounts;
  `)
}
