import Database from 'better-sqlite3'
import { getDatabase } from './index'
import { createUsersTable } from './migrations/001_create_users_table'
import { createReportsTable } from './migrations/002_create_reports_table'
import { createApiKeysTable } from './migrations/003_create_api_keys_table'
import { createCompaniesTable } from './migrations/004_create_companies_table'

export interface Migration {
  id: number
  name: string
  up: (db: Database.Database) => void
  down?: (db: Database.Database) => void
}

// Register all migrations here in order
// Add new migrations to the end of this array
export const migrations: Migration[] = [
  createUsersTable,
  createReportsTable,
  createApiKeysTable,
  createCompaniesTable
]

function createMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

function getAppliedMigrations(db: Database.Database): number[] {
  const stmt = db.prepare('SELECT id FROM migrations ORDER BY id')
  const rows = stmt.all() as Array<{ id: number }>
  return rows.map((row) => row.id)
}

function recordMigration(db: Database.Database, migration: Migration): void {
  const stmt = db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)')
  stmt.run(migration.id, migration.name)
}

function removeMigration(db: Database.Database, migrationId: number): void {
  const stmt = db.prepare('DELETE FROM migrations WHERE id = ?')
  stmt.run(migrationId)
}

export function runMigrations(): void {
  const db = getDatabase()

  console.log('Starting database migrations...')

  // Create migrations tracking table
  createMigrationsTable(db)

  // Get list of applied migrations
  const appliedMigrations = getAppliedMigrations(db)
  console.log(`Applied migrations: [${appliedMigrations.join(', ')}]`)

  // Find pending migrations
  const pendingMigrations = migrations.filter((m) => !appliedMigrations.includes(m.id))

  if (pendingMigrations.length === 0) {
    console.log('No pending migrations')
    return
  }

  console.log(`Found ${pendingMigrations.length} pending migration(s)`)

  // Run each pending migration in a transaction
  for (const migration of pendingMigrations) {
    console.log(`Running migration ${migration.id}: ${migration.name}`)

    try {
      db.transaction(() => {
        migration.up(db)
        recordMigration(db, migration)
      })()

      console.log(`✓ Migration ${migration.id} completed successfully`)
    } catch (error) {
      console.error(`✗ Migration ${migration.id} failed:`, error)
      throw error
    }
  }

  console.log('All migrations completed successfully')
}

export function rollbackMigration(targetId?: number): void {
  const db = getDatabase()

  console.log('Starting migration rollback...')

  const appliedMigrations = getAppliedMigrations(db)

  if (appliedMigrations.length === 0) {
    console.log('No migrations to rollback')
    return
  }

  // Determine which migrations to rollback
  const migrationsToRollback = targetId
    ? appliedMigrations.filter((id) => id >= targetId).sort((a, b) => b - a)
    : [appliedMigrations[appliedMigrations.length - 1]]

  for (const migrationId of migrationsToRollback) {
    const migration = migrations.find((m) => m.id === migrationId)

    if (!migration) {
      console.error(`Migration ${migrationId} not found`)
      continue
    }

    if (!migration.down) {
      console.error(`Migration ${migrationId} has no down function`)
      continue
    }

    console.log(`Rolling back migration ${migration.id}: ${migration.name}`)

    try {
      db.transaction(() => {
        migration.down!(db)
        removeMigration(db, migration.id)
      })()

      console.log(`✓ Migration ${migration.id} rolled back successfully`)
    } catch (error) {
      console.error(`✗ Rollback of migration ${migration.id} failed:`, error)
      throw error
    }
  }

  console.log('Rollback completed successfully')
}
