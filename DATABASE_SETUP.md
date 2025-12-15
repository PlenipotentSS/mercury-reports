# Database Setup Complete

The SQLite database with migrations has been successfully set up!

## What Was Added

### 1. Database Tables

Three tables were created through migrations:

- **users** - User information (id, name, email, created_at)
- **reports** - Reports linked to users (id, title, content, user_id, created_at, updated_at)
- **api_keys** - Mercury API keys storage (id, user_id, api_key, key_name, is_active, created_at, updated_at, last_used_at)

### 2. File Structure

```
src/main/database/
├── index.ts                    # Database connection management
├── migrations.ts               # Migration runner
├── queries.ts                  # Type-safe query functions
├── README.md                   # Detailed documentation
├── migrations/
│   ├── 001_create_users_table.ts
│   ├── 002_create_reports_table.ts
│   └── 003_create_api_keys_table.ts
└── examples/
    └── api-key-usage.ts        # Example usage patterns
```

### 3. API Key Management Functions

The following functions are available in [queries.ts](src/main/database/queries.ts):

- `createApiKey(userId, apiKey, keyName?)` - Store a new Mercury API key
- `getActiveApiKey(userId)` - Get the current active API key for a user
- `getApiKeysByUserId(userId, activeOnly?)` - Get all keys for a user
- `updateApiKey(id, apiKey, keyName?)` - Update an existing key
- `deactivateApiKey(id)` - Deactivate a key
- `activateApiKey(id)` - Reactivate a key
- `updateApiKeyLastUsed(id)` - Track when a key was last used
- `deleteApiKey(id)` - Remove a key

## Important Note: Native Module Rebuild

**better-sqlite3** is a native module that needs to be rebuilt for Electron whenever:
- You install dependencies fresh
- You change Node.js versions
- You update Electron

### How to Rebuild

If you see an error like:
```
Error: The module 'better_sqlite3.node' was compiled against a different Node.js version
```

Run this command:
```bash
npm run postinstall
```

This is already configured in package.json and will run automatically after `npm install`.

## Development Environment

### Node.js Version Issue

The project has a dev server error due to Node.js version compatibility with Vite 7.x. Your `.nvmrc` file should specify Node 20+:

```bash
# Update .nvmrc
echo "20" > .nvmrc

# Then switch to the correct version
nvm use
```

### Current Status

✅ Database code compiles successfully
✅ Build process works (`npm run build`)
✅ Migrations are registered and ready
⚠️ Dev server requires Node 20+ for Vite compatibility

## Usage Example

```typescript
import { createApiKey, getActiveApiKey } from './database/queries'

// Store a Mercury API key for a user
const apiKeyId = createApiKey(userId, 'your-mercury-api-key', 'Production Key')

// Retrieve it when making API calls
const apiKeyRecord = getActiveApiKey(userId)
if (apiKeyRecord) {
  const mercuryApiKey = apiKeyRecord.api_key
  // Use mercuryApiKey for Mercury API calls
}
```

## Database Location

When you run the app, the SQLite database will be created at:
- **macOS**: `~/Library/Application Support/react-ts/database.sqlite`
- **Windows**: `%APPDATA%/react-ts/database.sqlite`
- **Linux**: `~/.config/react-ts/database.sqlite`

## Next Steps

1. Update Node.js to version 20+ if you want to use `npm run dev`
2. Or continue using `npm run build` for production builds
3. Migrations will run automatically when the app starts
4. Start storing Mercury API keys using the provided functions

See [src/main/database/README.md](src/main/database/README.md) for more detailed documentation.
