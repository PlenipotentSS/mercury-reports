# Quick Fix for Dev Server

## Issue
The `better-sqlite3` module has been successfully installed and rebuilt for Electron. ✅

However, the dev server won't start because you're running Node.js v18.17.1, but the project requires Node.js 20+ (you have 22.16.0 specified in `.nvmrc`).

## Solution

Run these commands:

```bash
# Switch to the correct Node version
nvm use

# This will switch to Node 22.16.0 as specified in .nvmrc

# Reinstall dependencies with the correct Node version
npm install

# Start the dev server
npm run dev
```

## Verification

After switching Node versions, the database migrations should run automatically when the app starts. You should see output like:

```
Starting database migrations...
Applied migrations: []
Found 3 pending migration(s)
Running migration 1: create_users_table
✓ Migration 1 completed successfully
Running migration 2: create_reports_table
✓ Migration 2 completed successfully
Running migration 3: create_api_keys_table
✓ Migration 3 completed successfully
All migrations completed successfully
```

## Summary

✅ SQLite database with migrations - **COMPLETE**
✅ API keys table for Mercury API - **COMPLETE**
✅ Helper functions for CRUD operations - **COMPLETE**
✅ Native module rebuilt for Electron - **COMPLETE**
⚠️ Need to switch to Node 22.16.0 - **Run `nvm use`**

Everything is ready to go! Just switch your Node version and you're all set.
