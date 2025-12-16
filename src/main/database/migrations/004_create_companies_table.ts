import { Migration } from '../migrations'

export const createCompaniesTable: Migration = {
  id: 4,
  name: 'create_companies_table',
  up: (db) => {
    // Create companies table
    db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create index on user_id for faster lookups
    db.exec('CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id)')

    // Create index on is_active for filtering active companies
    db.exec('CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active)')

    // Migrate existing API keys to companies
    db.exec(`
      INSERT INTO companies (user_id, name, api_key, is_active, created_at, updated_at, last_used_at)
      SELECT
        user_id,
        COALESCE(key_name, 'Default Company'),
        api_key,
        is_active,
        created_at,
        updated_at,
        last_used_at
      FROM api_keys
    `)
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_companies_active')
    db.exec('DROP INDEX IF EXISTS idx_companies_user_id')
    db.exec('DROP TABLE IF EXISTS companies')
  }
}
