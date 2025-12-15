"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const Database = require("better-sqlite3");
const fs = require("fs");
const icon = path.join(__dirname, "../../resources/icon.png");
let db = null;
function getDatabase() {
  if (!db) {
    const userDataPath = electron.app.getPath("userData");
    const dbPath = path.join(userDataPath, "database.sqlite");
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    console.log(`Database initialized at: ${dbPath}`);
  }
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log("Database connection closed");
  }
}
const createUsersTable = {
  id: 1,
  name: "create_users_table",
  up: (db2) => {
    db2.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },
  down: (db2) => {
    db2.exec("DROP TABLE IF EXISTS users");
  }
};
const createReportsTable = {
  id: 2,
  name: "create_reports_table",
  up: (db2) => {
    db2.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    db2.exec("CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)");
  },
  down: (db2) => {
    db2.exec("DROP INDEX IF EXISTS idx_reports_user_id");
    db2.exec("DROP TABLE IF EXISTS reports");
  }
};
const createApiKeysTable = {
  id: 3,
  name: "create_api_keys_table",
  up: (db2) => {
    db2.exec(`
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
    `);
    db2.exec("CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)");
    db2.exec("CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active)");
  },
  down: (db2) => {
    db2.exec("DROP INDEX IF EXISTS idx_api_keys_active");
    db2.exec("DROP INDEX IF EXISTS idx_api_keys_user_id");
    db2.exec("DROP TABLE IF EXISTS api_keys");
  }
};
const migrations = [
  createUsersTable,
  createReportsTable,
  createApiKeysTable
];
function createMigrationsTable(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
function getAppliedMigrations(db2) {
  const stmt = db2.prepare("SELECT id FROM migrations ORDER BY id");
  const rows = stmt.all();
  return rows.map((row) => row.id);
}
function recordMigration(db2, migration) {
  const stmt = db2.prepare("INSERT INTO migrations (id, name) VALUES (?, ?)");
  stmt.run(migration.id, migration.name);
}
function runMigrations() {
  const db2 = getDatabase();
  console.log("Starting database migrations...");
  createMigrationsTable(db2);
  const appliedMigrations = getAppliedMigrations(db2);
  console.log(`Applied migrations: [${appliedMigrations.join(", ")}]`);
  const pendingMigrations = migrations.filter((m) => !appliedMigrations.includes(m.id));
  if (pendingMigrations.length === 0) {
    console.log("No pending migrations");
    return;
  }
  console.log(`Found ${pendingMigrations.length} pending migration(s)`);
  for (const migration of pendingMigrations) {
    console.log(`Running migration ${migration.id}: ${migration.name}`);
    try {
      db2.transaction(() => {
        migration.up(db2);
        recordMigration(db2, migration);
      })();
      console.log(`✓ Migration ${migration.id} completed successfully`);
    } catch (error) {
      console.error(`✗ Migration ${migration.id} failed:`, error);
      throw error;
    }
  }
  console.log("All migrations completed successfully");
}
function createUser(name, email) {
  const db2 = getDatabase();
  const stmt = db2.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
  const result = stmt.run(name, email);
  return result.lastInsertRowid;
}
function getUserByEmail(email) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM users WHERE email = ?");
  return stmt.get(email);
}
function getAllUsers() {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM users ORDER BY created_at DESC");
  return stmt.all();
}
function createApiKey(userId, apiKey, keyName) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "INSERT INTO api_keys (user_id, api_key, key_name) VALUES (?, ?, ?)"
  );
  const result = stmt.run(userId, apiKey, keyName ?? null);
  return result.lastInsertRowid;
}
function getApiKeysByUserId(userId, activeOnly = true) {
  const db2 = getDatabase();
  const query = activeOnly ? "SELECT * FROM api_keys WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC" : "SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC";
  const stmt = db2.prepare(query);
  return stmt.all(userId);
}
function getActiveApiKey(userId) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "SELECT * FROM api_keys WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1"
  );
  return stmt.get(userId);
}
function updateApiKey(id, apiKey, keyName) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "UPDATE api_keys SET api_key = ?, key_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  );
  stmt.run(apiKey, keyName ?? null, id);
}
function deactivateApiKey(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "UPDATE api_keys SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  );
  stmt.run(id);
}
function registerIpcHandlers() {
  electron.ipcMain.handle("user:login", async (_event, email) => {
    try {
      const user = getUserByEmail(email);
      return { success: true, user };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Failed to login" };
    }
  });
  electron.ipcMain.handle("user:signup", async (_event, name, email) => {
    try {
      const existingUser = getUserByEmail(email);
      if (existingUser) {
        return { success: false, error: "User with this email already exists" };
      }
      const userId = createUser(name, email);
      const user = { id: userId, name, email, created_at: (/* @__PURE__ */ new Date()).toISOString() };
      return { success: true, user };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: "Failed to create user" };
    }
  });
  electron.ipcMain.handle("user:getAll", async () => {
    try {
      const users = getAllUsers();
      return { success: true, users };
    } catch (error) {
      console.error("Get users error:", error);
      return { success: false, error: "Failed to get users" };
    }
  });
  electron.ipcMain.handle("apiKey:create", async (_event, userId, apiKey, keyName) => {
    try {
      const apiKeyId = createApiKey(userId, apiKey, keyName);
      return { success: true, apiKeyId };
    } catch (error) {
      console.error("Create API key error:", error);
      return { success: false, error: "Failed to create API key" };
    }
  });
  electron.ipcMain.handle("apiKey:getActive", async (_event, userId) => {
    try {
      const apiKey = getActiveApiKey(userId);
      return { success: true, apiKey };
    } catch (error) {
      console.error("Get active API key error:", error);
      return { success: false, error: "Failed to get API key" };
    }
  });
  electron.ipcMain.handle("apiKey:getAll", async (_event, userId, activeOnly = true) => {
    try {
      const apiKeys = getApiKeysByUserId(userId, activeOnly);
      return { success: true, apiKeys };
    } catch (error) {
      console.error("Get API keys error:", error);
      return { success: false, error: "Failed to get API keys" };
    }
  });
  electron.ipcMain.handle("apiKey:update", async (_event, id, apiKey, keyName) => {
    try {
      updateApiKey(id, apiKey, keyName);
      return { success: true };
    } catch (error) {
      console.error("Update API key error:", error);
      return { success: false, error: "Failed to update API key" };
    }
  });
  electron.ipcMain.handle("apiKey:deactivate", async (_event, id) => {
    try {
      deactivateApiKey(id);
      return { success: true };
    } catch (error) {
      console.error("Deactivate API key error:", error);
      return { success: false, error: "Failed to deactivate API key" };
    }
  });
  electron.ipcMain.handle(
    "mercury:fetchTransactions",
    async (_event, apiKey, queryString) => {
      try {
        console.log("Fetching transactions with query:", queryString);
        const url = queryString ? `https://api.mercury.com/api/v1/transactions?${queryString}` : "https://api.mercury.com/api/v1/transactions";
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch transactions: ${response.statusText}`);
        }
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        console.error("Fetch transactions error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch transactions"
        };
      }
    }
  );
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.electron");
  try {
    runMigrations();
  } catch (error) {
    console.error("Failed to run database migrations:", error);
  }
  registerIpcHandlers();
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("ping", () => console.log("pong"));
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  closeDatabase();
});
