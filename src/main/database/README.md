# SQLite Database with Migrations

This directory contains the SQLite database setup with a simple migration system.

## Structure

```
database/
├── index.ts              # Database connection management
├── migrations.ts         # Migration runner and rollback functions
├── migrations/           # Individual migration files
│   ├── 001_create_users_table.ts
│   └── 002_create_reports_table.ts
└── README.md            # This file
```

## Database Location

The SQLite database file is stored in the Electron app's user data directory:
- macOS: `~/Library/Application Support/your-app-name/database.sqlite`
- Windows: `%APPDATA%/your-app-name/database.sqlite`
- Linux: `~/.config/your-app-name/database.sqlite`

## Using the Database

### Getting a Database Connection

```typescript
import { getDatabase } from './database'

const db = getDatabase()

// Insert data
const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
stmt.run('John Doe', 'john@example.com')

// Query data
const users = db.prepare('SELECT * FROM users').all()
console.log(users)
```

### Creating a New Migration

1. Create a new file in `migrations/` directory with format: `XXX_description.ts`
2. Define your migration:

```typescript
import { Migration } from '../migrations'

export const yourMigrationName: Migration = {
  id: 3, // Must be unique and sequential
  name: 'your_migration_name',
  up: (db) => {
    // Forward migration
    db.exec(`
      CREATE TABLE IF NOT EXISTS your_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        column1 TEXT NOT NULL
      )
    `)
  },
  down: (db) => {
    // Rollback migration
    db.exec('DROP TABLE IF EXISTS your_table')
  }
}
```

3. Import and add it to the migrations array in `migrations.ts`:

```typescript
import { yourMigrationName } from './migrations/003_your_migration_name'

export const migrations: Migration[] = [
  createUsersTable,
  createReportsTable,
  yourMigrationName  // Add your migration here
]
```

## Migration System

### Running Migrations

Migrations run automatically when the app starts. They are executed in order based on their `id` field.

### Rollback Migrations (Advanced)

To rollback the last migration (in development):

```typescript
import { rollbackMigration } from './database/migrations'

// Rollback the last migration
rollbackMigration()

// Rollback to a specific migration ID
rollbackMigration(2) // Rollback all migrations from ID 2 onwards
```

## Best Practices

1. **Never modify existing migrations** - Once a migration has been deployed, create a new migration to make changes
2. **Always include a down function** - This allows for rollbacks during development
3. **Use transactions** - The migration system automatically wraps each migration in a transaction
4. **Test migrations** - Test both up and down migrations before deploying
5. **Sequential IDs** - Always increment migration IDs sequentially

## Features

- **Automatic migration tracking** - Keeps track of which migrations have been applied
- **Transaction safety** - Each migration runs in a transaction and rolls back on error
- **WAL mode** - Write-Ahead Logging is enabled for better performance
- **Connection pooling** - Single database connection shared across the app
- **Clean shutdown** - Database connection is properly closed when the app quits
