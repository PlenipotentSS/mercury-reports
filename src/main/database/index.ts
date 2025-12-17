import type BetterSqlite3 from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// Import better-sqlite3 with asar unpacking support
let DatabaseConstructor: typeof BetterSqlite3
try {
  // Try to load from unpacked location first
  const path = require('path')
  const betterSqlite3Path = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3'
  )
  DatabaseConstructor = require(betterSqlite3Path)
} catch (error) {
  // Fallback to normal require (for development)
  DatabaseConstructor = require('better-sqlite3')
}

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

    console.log(`Database initialized at: ${dbPath}`)
  }

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('Database connection closed')
  }
}
