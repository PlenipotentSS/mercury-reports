import { Migration } from '../migrations'

export const createApiKeysTable: Migration = {
  id: 3,
  name: 'create_api_keys_table',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        api_key TEXT NOT NULL,
        key_name TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create index on user_id for faster lookups
    db.exec('CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)')

    // Create index on is_active for filtering active keys
    db.exec('CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active)')
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_api_keys_active')
    db.exec('DROP INDEX IF EXISTS idx_api_keys_user_id')
    db.exec('DROP TABLE IF EXISTS api_keys')
  }
}
