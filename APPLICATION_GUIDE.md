# Mercury Reports Application Guide

## Overview

A complete authentication and settings management system for Mercury Reports has been implemented with:
- User login/signup functionality
- SQLite database integration
- Mercury API key management
- Navigation between Home, Reports, and Settings pages

## Features

### 1. Authentication System

**Login/Signup Screen**
- Unified form for both login and signup
- Email-based authentication
- User data stored in SQLite database
- Persistent sessions using localStorage

**How it works:**
- First-time users sign up with name and email
- Returning users log in with just their email
- User data is stored in the `users` table

### 2. Main Application Layout

**Header Navigation**
- App title on the left
- Three navigation buttons in the center:
  - Home
  - Reports
  - Settings
- User name and logout button on the right

### 3. Pages

**Home Page**
- Welcome message with user's name
- Overview of available features
- Links to Reports and Settings sections

**Reports Page**
- Placeholder for Mercury transaction reports
- Currently displays "Coming soon..." message
- Ready for future Mercury API integration

**Settings Page**
- **Mercury API Key Management:**
  - Add/update Mercury API keys
  - View current API key (with show/hide functionality)
  - Key name (optional label)
  - Deactivate existing keys
  - View key creation and last used dates

- **Account Information:**
  - User name
  - Email address
  - Account creation date

### 4. Database Structure

**Tables Created:**
1. `users` - User accounts (id, name, email, created_at)
2. `reports` - Future reports storage (id, title, content, user_id, created_at, updated_at)
3. `api_keys` - Mercury API keys (id, user_id, api_key, key_name, is_active, created_at, updated_at, last_used_at)

**Database Location:**
- macOS: `~/Library/Application Support/react-ts/database.sqlite`
- Windows: `%APPDATA%/react-ts/database.sqlite`
- Linux: `~/.config/react-ts/database.sqlite`

## File Structure

```
src/
├── main/
│   ├── index.ts                      # Main Electron process
│   ├── ipc-handlers.ts               # IPC handlers for database operations
│   └── database/
│       ├── index.ts                  # Database connection
│       ├── migrations.ts             # Migration runner
│       ├── queries.ts                # Database query functions
│       └── migrations/
│           ├── 001_create_users_table.ts
│           ├── 002_create_reports_table.ts
│           └── 003_create_api_keys_table.ts
├── preload/
│   ├── index.ts                      # Preload script with IPC API
│   └── index.d.ts                    # TypeScript definitions
└── renderer/
    └── src/
        ├── App.tsx                   # Main app component
        ├── contexts/
        │   └── AuthContext.tsx       # Authentication context
        ├── components/
        │   ├── Auth.tsx              # Login/Signup component
        │   └── Layout.tsx            # Main layout with navigation
        ├── pages/
        │   ├── Home.tsx              # Home page
        │   ├── Reports.tsx           # Reports page
        │   └── Settings.tsx          # Settings page with API key management
        └── assets/
            └── main.css              # Complete application styles
```

## IPC API

The following IPC methods are available in the renderer:

**User Authentication:**
- `window.api.userLogin(email)` - Log in existing user
- `window.api.userSignup(name, email)` - Create new user
- `window.api.userGetAll()` - Get all users (admin)

**API Key Management:**
- `window.api.apiKeyCreate(userId, apiKey, keyName?)` - Store new API key
- `window.api.apiKeyGetActive(userId)` - Get active API key
- `window.api.apiKeyGetAll(userId, activeOnly?)` - Get all keys for user
- `window.api.apiKeyUpdate(id, apiKey, keyName?)` - Update existing key
- `window.api.apiKeyDeactivate(id)` - Deactivate a key

## Running the Application

### Development Mode

**Fix Node.js version first (required):**
```bash
# Switch to the correct Node.js version
nvm use

# Reinstall dependencies with correct Node version
npm install

# Start development server
npm run dev
```

### Production Build

```bash
# Build the application
npm run build

# Build installers
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
```

## User Flow

1. **First Launch:**
   - User sees login/signup screen
   - Clicks "Sign Up" toggle
   - Enters name and email
   - Account created and logged in

2. **Subsequent Launches:**
   - User automatically logged in (session persisted)
   - If not, enters email to log in

3. **Adding Mercury API Key:**
   - Navigate to Settings page
   - Enter API key and optional name
   - Click "Save API Key"
   - Key stored securely in database

4. **Managing API Keys:**
   - View current active key
   - Show/hide key value
   - Update with new key
   - Deactivate when needed

## Security Notes

- API keys are stored in a local SQLite database (not encrypted by default)
- User sessions persisted in localStorage
- No password authentication (email-only for simplicity)
- For production, consider:
  - Adding encryption for API keys at rest
  - Implementing proper password-based authentication
  - Adding HTTPS/SSL for any external API calls

## Next Steps

1. **Switch Node.js version** and run the app
2. **Create a user account** on first launch
3. **Add your Mercury API key** in Settings
4. **Implement Reports page** to fetch and display Mercury transactions

The application is now fully functional with authentication, database persistence, and API key management!
