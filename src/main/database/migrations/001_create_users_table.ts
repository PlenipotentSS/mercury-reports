import { Migration } from '../migrations'

export const createUsersTable: Migration = {
  id: 1,
  name: 'create_users_table',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  },
  down: (db) => {
    db.exec('DROP TABLE IF EXISTS users')
  }
}
