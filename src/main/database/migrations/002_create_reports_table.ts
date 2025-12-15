import { Migration } from '../migrations'

export const createReportsTable: Migration = {
  id: 2,
  name: 'create_reports_table',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)

    // Create an index on user_id for faster lookups
    db.exec('CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)')
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_reports_user_id')
    db.exec('DROP TABLE IF EXISTS reports')
  }
}
