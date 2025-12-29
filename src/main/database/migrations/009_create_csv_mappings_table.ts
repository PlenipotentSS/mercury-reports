import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS csv_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      export_type TEXT NOT NULL,
      field_name TEXT NOT NULL,
      template TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE(company_id, export_type, field_name)
    );

    CREATE INDEX IF NOT EXISTS idx_csv_mappings_company_export
      ON csv_mappings(company_id, export_type);
  `)
}

export function down(db: Database.Database): void {
  db.exec(`
    DROP INDEX IF EXISTS idx_csv_mappings_company_export;
    DROP TABLE IF EXISTS csv_mappings;
  `)
}
