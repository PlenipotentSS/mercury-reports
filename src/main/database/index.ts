import type BetterSqlite3 from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import log from 'electron-log'

// Import better-sqlite3
// In production, electron-builder will unpack the native module automatically
import DatabaseConstructor from 'better-sqlite3'

let db: BetterSqlite3.Database | null = null

export function getDatabase(): BetterSqlite3.Database {
  if (!db) {
    const userDataPath = app.getPath('userData')
    const dbPath = join(userDataPath, 'database.sqlite')

    // Ensure the directory exists
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }

    db = new DatabaseConstructor(dbPath)
    db.pragma('journal_mode = WAL') // Enable Write-Ahead Logging for better performance

    log.info(`Database initialized at: ${dbPath}`)
  }

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    log.info('Database connection closed')
  }
}
