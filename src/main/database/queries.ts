import { getDatabase } from './index'

/**
 * Example database queries for the users table
 */

export interface User {
  id: number
  name: string
  email: string
  created_at: string
}

export interface Report {
  id: number
  title: string
  content: string | null
  user_id: number | null
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: number
  user_id: number
  api_key: string
  key_name: string | null
  is_active: number
  created_at: string
  updated_at: string
  last_used_at: string | null
}

export interface Company {
  id: number
  user_id: number
  name: string
  api_key: string
  is_active: number
  created_at: string
  updated_at: string
  last_used_at: string | null
}

// User queries
export function createUser(name: string, email: string): number {
  const db = getDatabase()
  const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
  const result = stmt.run(name, email)
  return result.lastInsertRowid as number
}

export function getUserById(id: number): User | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  return stmt.get(id) as User | undefined
}

export function getUserByEmail(email: string): User | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?')
  return stmt.get(email) as User | undefined
}

export function getAllUsers(): User[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC')
  return stmt.all() as User[]
}

export function updateUser(id: number, name: string, email: string): void {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?')
  stmt.run(name, email, id)
}

export function deleteUser(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM users WHERE id = ?')
  stmt.run(id)
}

// Report queries
export function createReport(title: string, content: string | null, userId?: number): number {
  const db = getDatabase()
  const stmt = db.prepare('INSERT INTO reports (title, content, user_id) VALUES (?, ?, ?)')
  const result = stmt.run(title, content, userId ?? null)
  return result.lastInsertRowid as number
}

export function getReportById(id: number): Report | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM reports WHERE id = ?')
  return stmt.get(id) as Report | undefined
}

export function getReportsByUserId(userId: number): Report[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC')
  return stmt.all(userId) as Report[]
}

export function getAllReports(): Report[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM reports ORDER BY created_at DESC')
  return stmt.all() as Report[]
}

export function updateReport(id: number, title: string, content: string | null): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE reports SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(title, content, id)
}

export function deleteReport(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM reports WHERE id = ?')
  stmt.run(id)
}

// API Key queries
export function createApiKey(
  userId: number,
  apiKey: string,
  keyName?: string
): number {
  const db = getDatabase()
  const stmt = db.prepare(
    'INSERT INTO api_keys (user_id, api_key, key_name) VALUES (?, ?, ?)'
  )
  const result = stmt.run(userId, apiKey, keyName ?? null)
  return result.lastInsertRowid as number
}

export function getApiKeyById(id: number): ApiKey | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM api_keys WHERE id = ?')
  return stmt.get(id) as ApiKey | undefined
}

export function getApiKeysByUserId(userId: number, activeOnly = true): ApiKey[] {
  const db = getDatabase()
  const query = activeOnly
    ? 'SELECT * FROM api_keys WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
    : 'SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  const stmt = db.prepare(query)
  return stmt.all(userId) as ApiKey[]
}

export function getActiveApiKey(userId: number): ApiKey | undefined {
  const db = getDatabase()
  const stmt = db.prepare(
    'SELECT * FROM api_keys WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1'
  )
  return stmt.get(userId) as ApiKey | undefined
}

export function updateApiKey(id: number, apiKey: string, keyName?: string): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE api_keys SET api_key = ?, key_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(apiKey, keyName ?? null, id)
}

export function deactivateApiKey(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE api_keys SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(id)
}

export function activateApiKey(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE api_keys SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(id)
}

export function updateApiKeyLastUsed(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(id)
}

export function deleteApiKey(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM api_keys WHERE id = ?')
  stmt.run(id)
}

export function deleteApiKeysByUserId(userId: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM api_keys WHERE user_id = ?')
  stmt.run(userId)
}

// Company queries
export function createCompany(userId: number, name: string, apiKey: string): number {
  const db = getDatabase()
  const stmt = db.prepare('INSERT INTO companies (user_id, name, api_key) VALUES (?, ?, ?)')
  const result = stmt.run(userId, name, apiKey)
  return result.lastInsertRowid as number
}

export function getCompanyById(id: number): Company | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM companies WHERE id = ?')
  return stmt.get(id) as Company | undefined
}

export function getCompaniesByUserId(userId: number, activeOnly = true): Company[] {
  const db = getDatabase()
  const query = activeOnly
    ? 'SELECT * FROM companies WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
    : 'SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC'
  const stmt = db.prepare(query)
  return stmt.all(userId) as Company[]
}

export function getActiveCompany(userId: number): Company | undefined {
  const db = getDatabase()
  const stmt = db.prepare(
    'SELECT * FROM companies WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1'
  )
  return stmt.get(userId) as Company | undefined
}

export function updateCompany(id: number, name: string, apiKey: string): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE companies SET name = ?, api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(name, apiKey, id)
}

export function deactivateCompany(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE companies SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(id)
}

export function activateCompany(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE companies SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(id)
}

export function updateCompanyLastUsed(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE companies SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(id)
}

export function deleteCompany(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM companies WHERE id = ?')
  stmt.run(id)
}

export function deleteCompaniesByUserId(userId: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM companies WHERE user_id = ?')
  stmt.run(userId)
}

// Company Ledger Record queries
export interface CompanyLedgerRecord {
  id: number
  company_id: number
  key: string
  value: string
  created_at: string
  updated_at: string
}

export function setCompanyLedgerRecord(
  companyId: number,
  key: string,
  value: string
): void {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO company_ledger_records (company_id, key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(company_id, key)
    DO UPDATE SET value = ?, updated_at = datetime('now')
  `)
  stmt.run(companyId, key, value, value)
}

export function getCompanyLedgerRecord(
  companyId: number,
  key: string
): CompanyLedgerRecord | undefined {
  const db = getDatabase()
  const stmt = db.prepare(
    'SELECT * FROM company_ledger_records WHERE company_id = ? AND key = ?'
  )
  return stmt.get(companyId, key) as CompanyLedgerRecord | undefined
}

export function getAllCompanyLedgerRecords(companyId: number): CompanyLedgerRecord[] {
  const db = getDatabase()
  const stmt = db.prepare(
    'SELECT * FROM company_ledger_records WHERE company_id = ? ORDER BY key'
  )
  return stmt.all(companyId) as CompanyLedgerRecord[]
}

export function deleteCompanyLedgerRecord(companyId: number, key: string): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM company_ledger_records WHERE company_id = ? AND key = ?')
  stmt.run(companyId, key)
}

export function deleteAllCompanyLedgerRecords(companyId: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM company_ledger_records WHERE company_id = ?')
  stmt.run(companyId)
}

// Ledger Preset queries
export interface LedgerPreset {
  id: number
  key: string
  label: string
  description: string | null
  created_at: string
  updated_at: string
}

export function createLedgerPreset(
  key: string,
  label: string,
  description?: string
): number {
  const db = getDatabase()
  const stmt = db.prepare(
    'INSERT INTO ledger_presets (key, label, description) VALUES (?, ?, ?)'
  )
  const result = stmt.run(key, label, description ?? null)
  return result.lastInsertRowid as number
}

export function getLedgerPresetById(id: number): LedgerPreset | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM ledger_presets WHERE id = ?')
  return stmt.get(id) as LedgerPreset | undefined
}

export function getLedgerPresetByKey(key: string): LedgerPreset | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM ledger_presets WHERE key = ?')
  return stmt.get(key) as LedgerPreset | undefined
}

export function getAllLedgerPresets(): LedgerPreset[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM ledger_presets ORDER BY key')
  return stmt.all() as LedgerPreset[]
}

export function updateLedgerPreset(
  id: number,
  key: string,
  label: string,
  description?: string
): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE ledger_presets SET key = ?, label = ?, description = ?, updated_at = datetime(\'now\') WHERE id = ?'
  )
  stmt.run(key, label, description ?? null, id)
}

export function deleteLedgerPreset(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM ledger_presets WHERE id = ?')
  stmt.run(id)
}
