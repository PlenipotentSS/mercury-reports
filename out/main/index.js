"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const fs = require("fs");
const log = require("electron-log");
const DatabaseConstructor = require("better-sqlite3");
const icon = path.join(__dirname, "../../resources/icon.png");
let db = null;
function getDatabase() {
  if (!db) {
    const userDataPath = electron.app.getPath("userData");
    const dbPath = path.join(userDataPath, "database.sqlite");
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    db = new DatabaseConstructor(dbPath);
    db.pragma("journal_mode = WAL");
    log.info(`Database initialized at: ${dbPath}`);
  }
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    log.info("Database connection closed");
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
const createCompaniesTable = {
  id: 4,
  name: "create_companies_table",
  up: (db2) => {
    db2.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db2.exec("CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id)");
    db2.exec("CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active)");
    db2.exec(`
      INSERT INTO companies (user_id, name, api_key, is_active, created_at, updated_at, last_used_at)
      SELECT
        user_id,
        COALESCE(key_name, 'Default Company'),
        api_key,
        is_active,
        created_at,
        updated_at,
        last_used_at
      FROM api_keys
    `);
  },
  down: (db2) => {
    db2.exec("DROP INDEX IF EXISTS idx_companies_active");
    db2.exec("DROP INDEX IF EXISTS idx_companies_user_id");
    db2.exec("DROP TABLE IF EXISTS companies");
  }
};
function up$1(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS company_ledger_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE(company_id, key)
    );

    CREATE INDEX idx_company_ledger_records_company_id ON company_ledger_records(company_id);
    CREATE INDEX idx_company_ledger_records_key ON company_ledger_records(key);
  `);
}
function down$1(db2) {
  db2.exec(`
    DROP INDEX IF EXISTS idx_company_ledger_records_key;
    DROP INDEX IF EXISTS idx_company_ledger_records_company_id;
    DROP TABLE IF EXISTS company_ledger_records;
  `);
}
function up(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS ledger_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_ledger_presets_key ON ledger_presets(key);
  `);
  const stmt = db2.prepare(`
    INSERT INTO ledger_presets (key, label, description)
    VALUES (?, ?, ?)
  `);
  stmt.run(
    "gl_name_mercury_checking",
    "GL Name Mercury Checking",
    "General ledger name for Mercury checking account transactions"
  );
  stmt.run(
    "gl_name_mercury_credit_card",
    "GL Name Mercury Credit Card",
    "General ledger name for Mercury credit card transactions"
  );
}
function down(db2) {
  db2.exec(`
    DROP INDEX IF EXISTS idx_ledger_presets_key;
    DROP TABLE IF EXISTS ledger_presets;
  `);
}
const migrations = [
  createUsersTable,
  createReportsTable,
  createApiKeysTable,
  createCompaniesTable,
  {
    id: 5,
    name: "create_company_ledger_records_table",
    up: up$1,
    down: down$1
  },
  {
    id: 6,
    name: "create_ledger_presets_table",
    up,
    down
  }
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
  log.info("Starting database migrations...");
  createMigrationsTable(db2);
  const appliedMigrations = getAppliedMigrations(db2);
  log.info(`Applied migrations: [${appliedMigrations.join(", ")}]`);
  const pendingMigrations = migrations.filter((m) => !appliedMigrations.includes(m.id));
  if (pendingMigrations.length === 0) {
    log.info("No pending migrations");
    return;
  }
  log.info(`Found ${pendingMigrations.length} pending migration(s)`);
  for (const migration of pendingMigrations) {
    log.info(`Running migration ${migration.id}: ${migration.name}`);
    try {
      db2.transaction(() => {
        migration.up(db2);
        recordMigration(db2, migration);
      })();
      log.info(`✓ Migration ${migration.id} completed successfully`);
    } catch (error) {
      log.error(`✗ Migration ${migration.id} failed:`, error);
      throw error;
    }
  }
  log.info("All migrations completed successfully");
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
function updateUser(id, name, email) {
  const db2 = getDatabase();
  const stmt = db2.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
  stmt.run(name, email, id);
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
function createCompany(userId, name, apiKey) {
  const db2 = getDatabase();
  const stmt = db2.prepare("INSERT INTO companies (user_id, name, api_key) VALUES (?, ?, ?)");
  const result = stmt.run(userId, name, apiKey);
  return result.lastInsertRowid;
}
function getCompanyById(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM companies WHERE id = ?");
  return stmt.get(id);
}
function getCompaniesByUserId(userId, activeOnly = true) {
  const db2 = getDatabase();
  const query = activeOnly ? "SELECT * FROM companies WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC" : "SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC";
  const stmt = db2.prepare(query);
  return stmt.all(userId);
}
function updateCompany(id, name, apiKey) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "UPDATE companies SET name = ?, api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  );
  stmt.run(name, apiKey, id);
}
function deactivateCompany(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "UPDATE companies SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  );
  stmt.run(id);
}
function updateCompanyLastUsed(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "UPDATE companies SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?"
  );
  stmt.run(id);
}
function setCompanyLedgerRecord(companyId, key, value) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO company_ledger_records (company_id, key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(company_id, key)
    DO UPDATE SET value = ?, updated_at = datetime('now')
  `);
  stmt.run(companyId, key, value, value);
}
function getCompanyLedgerRecord(companyId, key) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "SELECT * FROM company_ledger_records WHERE company_id = ? AND key = ?"
  );
  return stmt.get(companyId, key);
}
function getAllCompanyLedgerRecords(companyId) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "SELECT * FROM company_ledger_records WHERE company_id = ? ORDER BY key"
  );
  return stmt.all(companyId);
}
function deleteCompanyLedgerRecord(companyId, key) {
  const db2 = getDatabase();
  const stmt = db2.prepare("DELETE FROM company_ledger_records WHERE company_id = ? AND key = ?");
  stmt.run(companyId, key);
}
function createLedgerPreset(key, label, description) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "INSERT INTO ledger_presets (key, label, description) VALUES (?, ?, ?)"
  );
  const result = stmt.run(key, label, description ?? null);
  return result.lastInsertRowid;
}
function getLedgerPresetById(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM ledger_presets WHERE id = ?");
  return stmt.get(id);
}
function getLedgerPresetByKey(key) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM ledger_presets WHERE key = ?");
  return stmt.get(key);
}
function getAllLedgerPresets() {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM ledger_presets ORDER BY key");
  return stmt.all();
}
function updateLedgerPreset(id, key, label, description) {
  const db2 = getDatabase();
  const stmt = db2.prepare(
    "UPDATE ledger_presets SET key = ?, label = ?, description = ?, updated_at = datetime('now') WHERE id = ?"
  );
  stmt.run(key, label, description ?? null, id);
}
function deleteLedgerPreset(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("DELETE FROM ledger_presets WHERE id = ?");
  stmt.run(id);
}
function registerIpcHandlers() {
  electron.ipcMain.handle("user:login", async (_event, email) => {
    try {
      const user = getUserByEmail(email);
      return { success: true, user };
    } catch (error) {
      log.error("Login error:", error);
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
      log.error("Signup error:", error);
      return { success: false, error: "Failed to create user" };
    }
  });
  electron.ipcMain.handle("user:getAll", async () => {
    try {
      const users = getAllUsers();
      return { success: true, users };
    } catch (error) {
      log.error("Get users error:", error);
      return { success: false, error: "Failed to get users" };
    }
  });
  electron.ipcMain.handle("user:update", async (_event, id, name, email) => {
    try {
      const existingUser = getUserByEmail(email);
      if (existingUser && existingUser.id !== id) {
        return { success: false, error: "Email is already in use by another account" };
      }
      updateUser(id, name, email);
      const updatedUser = { id, name, email, created_at: existingUser?.created_at || (/* @__PURE__ */ new Date()).toISOString() };
      return { success: true, user: updatedUser };
    } catch (error) {
      log.error("Update user error:", error);
      return { success: false, error: "Failed to update user" };
    }
  });
  electron.ipcMain.handle("apiKey:create", async (_event, userId, apiKey, keyName) => {
    try {
      const apiKeyId = createApiKey(userId, apiKey, keyName);
      return { success: true, apiKeyId };
    } catch (error) {
      log.error("Create API key error:", error);
      return { success: false, error: "Failed to create API key" };
    }
  });
  electron.ipcMain.handle("apiKey:getActive", async (_event, userId) => {
    try {
      const apiKey = getActiveApiKey(userId);
      return { success: true, apiKey };
    } catch (error) {
      log.error("Get active API key error:", error);
      return { success: false, error: "Failed to get API key" };
    }
  });
  electron.ipcMain.handle("apiKey:getAll", async (_event, userId, activeOnly = true) => {
    try {
      const apiKeys = getApiKeysByUserId(userId, activeOnly);
      return { success: true, apiKeys };
    } catch (error) {
      log.error("Get API keys error:", error);
      return { success: false, error: "Failed to get API keys" };
    }
  });
  electron.ipcMain.handle("apiKey:update", async (_event, id, apiKey, keyName) => {
    try {
      updateApiKey(id, apiKey, keyName);
      return { success: true };
    } catch (error) {
      log.error("Update API key error:", error);
      return { success: false, error: "Failed to update API key" };
    }
  });
  electron.ipcMain.handle("apiKey:deactivate", async (_event, id) => {
    try {
      deactivateApiKey(id);
      return { success: true };
    } catch (error) {
      log.error("Deactivate API key error:", error);
      return { success: false, error: "Failed to deactivate API key" };
    }
  });
  electron.ipcMain.handle("company:create", async (_event, userId, name, apiKey) => {
    try {
      const companyId = createCompany(userId, name, apiKey);
      return { success: true, companyId };
    } catch (error) {
      log.error("Create company error:", error);
      return { success: false, error: "Failed to create company" };
    }
  });
  electron.ipcMain.handle("company:getById", async (_event, id) => {
    try {
      const company = getCompanyById(id);
      return { success: true, company };
    } catch (error) {
      log.error("Get company error:", error);
      return { success: false, error: "Failed to get company" };
    }
  });
  electron.ipcMain.handle("company:getAll", async (_event, userId, activeOnly = true) => {
    try {
      const companies = getCompaniesByUserId(userId, activeOnly);
      return { success: true, companies };
    } catch (error) {
      log.error("Get companies error:", error);
      return { success: false, error: "Failed to get companies" };
    }
  });
  electron.ipcMain.handle("company:update", async (_event, id, name, apiKey) => {
    try {
      updateCompany(id, name, apiKey);
      return { success: true };
    } catch (error) {
      log.error("Update company error:", error);
      return { success: false, error: "Failed to update company" };
    }
  });
  electron.ipcMain.handle("company:deactivate", async (_event, id) => {
    try {
      deactivateCompany(id);
      return { success: true };
    } catch (error) {
      log.error("Deactivate company error:", error);
      return { success: false, error: "Failed to deactivate company" };
    }
  });
  electron.ipcMain.handle("company:updateLastUsed", async (_event, id) => {
    try {
      updateCompanyLastUsed(id);
      return { success: true };
    } catch (error) {
      log.error("Update company last used error:", error);
      return { success: false, error: "Failed to update company last used" };
    }
  });
  electron.ipcMain.handle("mercury:fetchAccounts", async (_event, apiKey) => {
    try {
      const url = "https://api.mercury.com/api/v1/accounts";
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      log.error("Fetch accounts error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch accounts"
      };
    }
  });
  electron.ipcMain.handle(
    "mercury:fetchTransactions",
    async (_event, apiKey, queryString) => {
      try {
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
        log.error("Fetch transactions error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch transactions"
        };
      }
    }
  );
  electron.ipcMain.handle(
    "companyLedger:set",
    async (_event, companyId, key, value) => {
      try {
        setCompanyLedgerRecord(companyId, key, value);
        return { success: true };
      } catch (error) {
        log.error("Set company ledger record error:", error);
        return { success: false, error: "Failed to set ledger record" };
      }
    }
  );
  electron.ipcMain.handle("companyLedger:get", async (_event, companyId, key) => {
    try {
      const record = getCompanyLedgerRecord(companyId, key);
      return { success: true, record };
    } catch (error) {
      log.error("Get company ledger record error:", error);
      return { success: false, error: "Failed to get ledger record" };
    }
  });
  electron.ipcMain.handle("companyLedger:getAll", async (_event, companyId) => {
    try {
      const records = getAllCompanyLedgerRecords(companyId);
      return { success: true, records };
    } catch (error) {
      log.error("Get all company ledger records error:", error);
      return { success: false, error: "Failed to get ledger records" };
    }
  });
  electron.ipcMain.handle("companyLedger:delete", async (_event, companyId, key) => {
    try {
      deleteCompanyLedgerRecord(companyId, key);
      return { success: true };
    } catch (error) {
      log.error("Delete company ledger record error:", error);
      return { success: false, error: "Failed to delete ledger record" };
    }
  });
  electron.ipcMain.handle(
    "ledgerPreset:create",
    async (_event, key, label, description) => {
      try {
        const id = createLedgerPreset(key, label, description);
        return { success: true, id };
      } catch (error) {
        log.error("Create ledger preset error:", error);
        return { success: false, error: "Failed to create ledger preset" };
      }
    }
  );
  electron.ipcMain.handle("ledgerPreset:getById", async (_event, id) => {
    try {
      const preset = getLedgerPresetById(id);
      return { success: true, preset };
    } catch (error) {
      log.error("Get ledger preset error:", error);
      return { success: false, error: "Failed to get ledger preset" };
    }
  });
  electron.ipcMain.handle("ledgerPreset:getByKey", async (_event, key) => {
    try {
      const preset = getLedgerPresetByKey(key);
      return { success: true, preset };
    } catch (error) {
      log.error("Get ledger preset by key error:", error);
      return { success: false, error: "Failed to get ledger preset" };
    }
  });
  electron.ipcMain.handle("ledgerPreset:getAll", async () => {
    try {
      const presets = getAllLedgerPresets();
      return { success: true, presets };
    } catch (error) {
      log.error("Get all ledger presets error:", error);
      return { success: false, error: "Failed to get ledger presets" };
    }
  });
  electron.ipcMain.handle(
    "ledgerPreset:update",
    async (_event, id, key, label, description) => {
      try {
        updateLedgerPreset(id, key, label, description);
        return { success: true };
      } catch (error) {
        log.error("Update ledger preset error:", error);
        return { success: false, error: "Failed to update ledger preset" };
      }
    }
  );
  electron.ipcMain.handle("ledgerPreset:delete", async (_event, id) => {
    try {
      deleteLedgerPreset(id);
      return { success: true };
    } catch (error) {
      log.error("Delete ledger preset error:", error);
      return { success: false, error: "Failed to delete ledger preset" };
    }
  });
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
    log.error("Failed to run database migrations:", error);
  }
  registerIpcHandlers();
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("ping", () => log.info("pong"));
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
