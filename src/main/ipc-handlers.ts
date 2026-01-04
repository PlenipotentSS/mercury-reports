import { ipcMain } from 'electron'
import {
  createUser,
  getUserByEmail,
  getAllUsers,
  updateUser,
  createApiKey,
  getActiveApiKey,
  getApiKeysByUserId,
  updateApiKey,
  deactivateApiKey,
  createCompany,
  getCompanyById,
  getCompaniesByUserId,
  updateCompany,
  deactivateCompany,
  updateCompanyLastUsed,
  setCompanyLedgerRecord,
  getCompanyLedgerRecord,
  getAllCompanyLedgerRecords,
  deleteCompanyLedgerRecord,
  createLedgerPreset,
  getLedgerPresetById,
  getLedgerPresetByKey,
  getAllLedgerPresets,
  updateLedgerPreset,
  deleteLedgerPreset,
  upsertMercuryAccount,
  getMercuryAccountsByCompanyId,
  setAccountLedgerMapping,
  getAccountLedgerMappingsByAccountId,
  getCsvMappingsByCompanyAndType,
  upsertCsvMapping,
  deleteCsvMapping
} from './database/queries'
import log from 'electron-log'

export function registerIpcHandlers(): void {
  // User authentication handlers
  ipcMain.handle('user:login', async (_event, email: string) => {
    try {
      const user = getUserByEmail(email)
      return { success: true, user }
    } catch (error) {
      log.error('Login error:', error)
      return { success: false, error: 'Failed to login' }
    }
  })

  ipcMain.handle('user:signup', async (_event, name: string, email: string) => {
    try {
      // Check if user already exists
      const existingUser = getUserByEmail(email)
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' }
      }

      const userId = createUser(name, email)
      const user = { id: userId, name, email, created_at: new Date().toISOString() }
      return { success: true, user }
    } catch (error) {
      log.error('Signup error:', error)
      return { success: false, error: 'Failed to create user' }
    }
  })

  ipcMain.handle('user:getAll', async () => {
    try {
      const users = getAllUsers()
      return { success: true, users }
    } catch (error) {
      log.error('Get users error:', error)
      return { success: false, error: 'Failed to get users' }
    }
  })

  ipcMain.handle('user:update', async (_event, id: number, name: string, email: string) => {
    try {
      // Check if email is already used by another user
      const existingUser = getUserByEmail(email)
      if (existingUser && existingUser.id !== id) {
        return { success: false, error: 'Email is already in use by another account' }
      }

      updateUser(id, name, email)
      const updatedUser = { id, name, email, created_at: existingUser?.created_at || new Date().toISOString() }
      return { success: true, user: updatedUser }
    } catch (error) {
      log.error('Update user error:', error)
      return { success: false, error: 'Failed to update user' }
    }
  })

  // API Key handlers
  ipcMain.handle('apiKey:create', async (_event, userId: number, apiKey: string, keyName?: string) => {
    try {
      const apiKeyId = createApiKey(userId, apiKey, keyName)
      return { success: true, apiKeyId }
    } catch (error) {
      log.error('Create API key error:', error)
      return { success: false, error: 'Failed to create API key' }
    }
  })

  ipcMain.handle('apiKey:getActive', async (_event, userId: number) => {
    try {
      const apiKey = getActiveApiKey(userId)
      return { success: true, apiKey }
    } catch (error) {
      log.error('Get active API key error:', error)
      return { success: false, error: 'Failed to get API key' }
    }
  })

  ipcMain.handle('apiKey:getAll', async (_event, userId: number, activeOnly = true) => {
    try {
      const apiKeys = getApiKeysByUserId(userId, activeOnly)
      return { success: true, apiKeys }
    } catch (error) {
      log.error('Get API keys error:', error)
      return { success: false, error: 'Failed to get API keys' }
    }
  })

  ipcMain.handle('apiKey:update', async (_event, id: number, apiKey: string, keyName?: string) => {
    try {
      updateApiKey(id, apiKey, keyName)
      return { success: true }
    } catch (error) {
      log.error('Update API key error:', error)
      return { success: false, error: 'Failed to update API key' }
    }
  })

  ipcMain.handle('apiKey:deactivate', async (_event, id: number) => {
    try {
      deactivateApiKey(id)
      return { success: true }
    } catch (error) {
      log.error('Deactivate API key error:', error)
      return { success: false, error: 'Failed to deactivate API key' }
    }
  })

  // Company handlers
  ipcMain.handle('company:create', async (_event, userId: number, name: string, apiKey: string) => {
    try {
      const companyId = createCompany(userId, name, apiKey)
      return { success: true, companyId }
    } catch (error) {
      log.error('Create company error:', error)
      return { success: false, error: 'Failed to create company' }
    }
  })

  ipcMain.handle('company:getById', async (_event, id: number) => {
    try {
      const company = getCompanyById(id)
      return { success: true, company }
    } catch (error) {
      log.error('Get company error:', error)
      return { success: false, error: 'Failed to get company' }
    }
  })

  ipcMain.handle('company:getAll', async (_event, userId: number, activeOnly = true) => {
    try {
      const companies = getCompaniesByUserId(userId, activeOnly)
      return { success: true, companies }
    } catch (error) {
      log.error('Get companies error:', error)
      return { success: false, error: 'Failed to get companies' }
    }
  })

  ipcMain.handle('company:update', async (_event, id: number, name: string, apiKey: string) => {
    try {
      updateCompany(id, name, apiKey)
      return { success: true }
    } catch (error) {
      log.error('Update company error:', error)
      return { success: false, error: 'Failed to update company' }
    }
  })

  ipcMain.handle('company:deactivate', async (_event, id: number) => {
    try {
      deactivateCompany(id)
      return { success: true }
    } catch (error) {
      log.error('Deactivate company error:', error)
      return { success: false, error: 'Failed to deactivate company' }
    }
  })

  ipcMain.handle('company:updateLastUsed', async (_event, id: number) => {
    try {
      updateCompanyLastUsed(id)
      return { success: true }
    } catch (error) {
      log.error('Update company last used error:', error)
      return { success: false, error: 'Failed to update company last used' }
    }
  })

  // Mercury API handlers
  ipcMain.handle('mercury:fetchAccounts', async (_event, apiKey: string) => {
    try {
      const url = 'https://api.mercury.com/api/v1/accounts'

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      log.error('Fetch accounts error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch accounts'
      }
    }
  })

  ipcMain.handle('mercury:fetchCreditAccounts', async (_event, apiKey: string) => {
    try {
      const url = 'https://api.mercury.com/api/v1/credit'

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch credit accounts: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      log.error('Fetch credit accounts error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch credit accounts'
      }
    }
  })

  ipcMain.handle(
    'mercury:fetchTransactions',
    async (_event, apiKey: string, queryString?: string) => {
      try {
        const url = queryString
          ? `https://api.mercury.com/api/v1/transactions?${queryString}`
          : 'https://api.mercury.com/api/v1/transactions'

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch transactions: ${response.statusText}`)
        }

        const data = await response.json()
        return { success: true, data }
      } catch (error) {
        log.error('Fetch transactions error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch transactions'
        }
      }
    }
  )

  // Company Ledger Record handlers
  ipcMain.handle(
    'companyLedger:set',
    async (_event, companyId: number, key: string, value: string) => {
      try {
        setCompanyLedgerRecord(companyId, key, value)
        return { success: true }
      } catch (error) {
        log.error('Set company ledger record error:', error)
        return { success: false, error: 'Failed to set ledger record' }
      }
    }
  )

  ipcMain.handle('companyLedger:get', async (_event, companyId: number, key: string) => {
    try {
      const record = getCompanyLedgerRecord(companyId, key)
      return { success: true, record }
    } catch (error) {
      log.error('Get company ledger record error:', error)
      return { success: false, error: 'Failed to get ledger record' }
    }
  })

  ipcMain.handle('companyLedger:getAll', async (_event, companyId: number) => {
    try {
      const records = getAllCompanyLedgerRecords(companyId)
      return { success: true, records }
    } catch (error) {
      log.error('Get all company ledger records error:', error)
      return { success: false, error: 'Failed to get ledger records' }
    }
  })

  ipcMain.handle('companyLedger:delete', async (_event, companyId: number, key: string) => {
    try {
      deleteCompanyLedgerRecord(companyId, key)
      return { success: true }
    } catch (error) {
      log.error('Delete company ledger record error:', error)
      return { success: false, error: 'Failed to delete ledger record' }
    }
  })

  // Ledger Preset handlers
  ipcMain.handle(
    'ledgerPreset:create',
    async (_event, key: string, label: string, description?: string) => {
      try {
        const id = createLedgerPreset(key, label, description)
        return { success: true, id }
      } catch (error) {
        log.error('Create ledger preset error:', error)
        return { success: false, error: 'Failed to create ledger preset' }
      }
    }
  )

  ipcMain.handle('ledgerPreset:getById', async (_event, id: number) => {
    try {
      const preset = getLedgerPresetById(id)
      return { success: true, preset }
    } catch (error) {
      log.error('Get ledger preset error:', error)
      return { success: false, error: 'Failed to get ledger preset' }
    }
  })

  ipcMain.handle('ledgerPreset:getByKey', async (_event, key: string) => {
    try {
      const preset = getLedgerPresetByKey(key)
      return { success: true, preset }
    } catch (error) {
      log.error('Get ledger preset by key error:', error)
      return { success: false, error: 'Failed to get ledger preset' }
    }
  })

  ipcMain.handle('ledgerPreset:getAll', async () => {
    try {
      const presets = getAllLedgerPresets()
      return { success: true, presets }
    } catch (error) {
      log.error('Get all ledger presets error:', error)
      return { success: false, error: 'Failed to get ledger presets' }
    }
  })

  ipcMain.handle(
    'ledgerPreset:update',
    async (_event, id: number, key: string, label: string, description?: string) => {
      try {
        updateLedgerPreset(id, key, label, description)
        return { success: true }
      } catch (error) {
        log.error('Update ledger preset error:', error)
        return { success: false, error: 'Failed to update ledger preset' }
      }
    }
  )

  ipcMain.handle('ledgerPreset:delete', async (_event, id: number) => {
    try {
      deleteLedgerPreset(id)
      return { success: true }
    } catch (error) {
      log.error('Delete ledger preset error:', error)
      return { success: false, error: 'Failed to delete ledger preset' }
    }
  })

  // Mercury Account handlers
  ipcMain.handle('mercuryAccount:syncFromApi', async (_event, companyId: number, apiKey: string) => {
    try {
      const url = 'https://api.mercury.com/api/v1/accounts'

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`)
      }

      const data = await response.json()

      // Sync accounts to database
      const syncedAccounts: number[] = []
      if (data.accounts && Array.isArray(data.accounts)) {
        for (const account of data.accounts) {
          const accountId = upsertMercuryAccount(
            companyId,
            account.id,
            account.name || account.legalBusinessName || 'Unnamed Account',
            account.nickname,
            account.dashboardLink,
            account.status,
            account.type
          )
          syncedAccounts.push(accountId)
        }
      }

      return { success: true, syncedCount: syncedAccounts.length }
    } catch (error) {
      log.error('Sync Mercury accounts error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync Mercury accounts'
      }
    }
  })

  ipcMain.handle('mercuryAccount:getByCompanyId', async (_event, companyId: number) => {
    try {
      const accounts = getMercuryAccountsByCompanyId(companyId)
      return { success: true, accounts }
    } catch (error) {
      log.error('Get Mercury accounts error:', error)
      return { success: false, error: 'Failed to get Mercury accounts' }
    }
  })

  ipcMain.handle(
    'mercuryAccount:setLedgerMapping',
    async (_event, mercuryAccountId: number, ledgerPresetId: number) => {
      try {
        setAccountLedgerMapping(mercuryAccountId, ledgerPresetId)
        return { success: true }
      } catch (error) {
        log.error('Set account ledger mapping error:', error)
        return { success: false, error: 'Failed to set ledger mapping' }
      }
    }
  )

  ipcMain.handle(
    'mercuryAccount:getLedgerMappings',
    async (_event, mercuryAccountId: number) => {
      try {
        const mappings = getAccountLedgerMappingsByAccountId(mercuryAccountId)
        return { success: true, mappings }
      } catch (error) {
        log.error('Get account ledger mappings error:', error)
        return { success: false, error: 'Failed to get ledger mappings' }
      }
    }
  )

  // CSV Mapping handlers
  ipcMain.handle(
    'csvMapping:getByCompanyAndType',
    async (_event, companyId: number, exportType: string) => {
      try {
        const mappings = getCsvMappingsByCompanyAndType(companyId, exportType)
        return { success: true, mappings }
      } catch (error) {
        log.error('Get CSV mappings error:', error)
        return { success: false, error: 'Failed to get CSV mappings' }
      }
    }
  )

  ipcMain.handle(
    'csvMapping:upsert',
    async (_event, companyId: number, exportType: string, fieldName: string, template: string) => {
      try {
        log.info(`Upserting CSV mapping: companyId=${companyId}, exportType=${exportType}, fieldName=${fieldName}, template=${template}`)
        upsertCsvMapping(companyId, exportType, fieldName, template)
        log.info('CSV mapping upserted successfully')
        return { success: true }
      } catch (error) {
        log.error('Upsert CSV mapping error:', error)
        return { success: false, error: 'Failed to save CSV mapping' }
      }
    }
  )

  ipcMain.handle('csvMapping:delete', async (_event, id: number) => {
    try {
      deleteCsvMapping(id)
      return { success: true }
    } catch (error) {
      log.error('Delete CSV mapping error:', error)
      return { success: false, error: 'Failed to delete CSV mapping' }
    }
  })
}
