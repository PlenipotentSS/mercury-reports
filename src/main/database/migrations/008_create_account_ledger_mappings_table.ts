import type { Database } from 'better-sqlite3'

export function up(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_ledger_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mercury_account_id INTEGER NOT NULL,
      ledger_preset_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (mercury_account_id) REFERENCES mercury_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (ledger_preset_id) REFERENCES ledger_presets(id) ON DELETE CASCADE,
      UNIQUE(mercury_account_id, ledger_preset_id)
    );

    CREATE INDEX idx_account_ledger_mappings_mercury_account ON account_ledger_mappings(mercury_account_id);
    CREATE INDEX idx_account_ledger_mappings_ledger_preset ON account_ledger_mappings(ledger_preset_id);
  `)
}

export function down(db: Database): void {
  db.exec(`
    DROP INDEX IF EXISTS idx_account_ledger_mappings_ledger_preset;
    DROP INDEX IF EXISTS idx_account_ledger_mappings_mercury_account;
    DROP TABLE IF EXISTS account_ledger_mappings;
  `)
}
