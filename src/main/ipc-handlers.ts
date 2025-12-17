import { ipcMain } from 'electron'
import {
  createUser,
  getUserByEmail,
  getAllUsers,
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
  deleteCompanyLedgerRecord
} from './database/queries'

export function registerIpcHandlers(): void {
  // User authentication handlers
  ipcMain.handle('user:login', async (_event, email: string) => {
    try {
      const user = getUserByEmail(email)
      return { success: true, user }
    } catch (error) {
      console.error('Login error:', error)
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
      console.error('Signup error:', error)
      return { success: false, error: 'Failed to create user' }
    }
  })

  ipcMain.handle('user:getAll', async () => {
    try {
      const users = getAllUsers()
      return { success: true, users }
    } catch (error) {
      console.error('Get users error:', error)
      return { success: false, error: 'Failed to get users' }
    }
  })

  // API Key handlers
  ipcMain.handle('apiKey:create', async (_event, userId: number, apiKey: string, keyName?: string) => {
    try {
      const apiKeyId = createApiKey(userId, apiKey, keyName)
      return { success: true, apiKeyId }
    } catch (error) {
      console.error('Create API key error:', error)
      return { success: false, error: 'Failed to create API key' }
    }
  })

  ipcMain.handle('apiKey:getActive', async (_event, userId: number) => {
    try {
      const apiKey = getActiveApiKey(userId)
      return { success: true, apiKey }
    } catch (error) {
      console.error('Get active API key error:', error)
      return { success: false, error: 'Failed to get API key' }
    }
  })

  ipcMain.handle('apiKey:getAll', async (_event, userId: number, activeOnly = true) => {
    try {
      const apiKeys = getApiKeysByUserId(userId, activeOnly)
      return { success: true, apiKeys }
    } catch (error) {
      console.error('Get API keys error:', error)
      return { success: false, error: 'Failed to get API keys' }
    }
  })

  ipcMain.handle('apiKey:update', async (_event, id: number, apiKey: string, keyName?: string) => {
    try {
      updateApiKey(id, apiKey, keyName)
      return { success: true }
    } catch (error) {
      console.error('Update API key error:', error)
      return { success: false, error: 'Failed to update API key' }
    }
  })

  ipcMain.handle('apiKey:deactivate', async (_event, id: number) => {
    try {
      deactivateApiKey(id)
      return { success: true }
    } catch (error) {
      console.error('Deactivate API key error:', error)
      return { success: false, error: 'Failed to deactivate API key' }
    }
  })

  // Company handlers
  ipcMain.handle('company:create', async (_event, userId: number, name: string, apiKey: string) => {
    try {
      const companyId = createCompany(userId, name, apiKey)
      return { success: true, companyId }
    } catch (error) {
      console.error('Create company error:', error)
      return { success: false, error: 'Failed to create company' }
    }
  })

  ipcMain.handle('company:getById', async (_event, id: number) => {
    try {
      const company = getCompanyById(id)
      return { success: true, company }
    } catch (error) {
      console.error('Get company error:', error)
      return { success: false, error: 'Failed to get company' }
    }
  })

  ipcMain.handle('company:getAll', async (_event, userId: number, activeOnly = true) => {
    try {
      const companies = getCompaniesByUserId(userId, activeOnly)
      return { success: true, companies }
    } catch (error) {
      console.error('Get companies error:', error)
      return { success: false, error: 'Failed to get companies' }
    }
  })

  ipcMain.handle('company:update', async (_event, id: number, name: string, apiKey: string) => {
    try {
      updateCompany(id, name, apiKey)
      return { success: true }
    } catch (error) {
      console.error('Update company error:', error)
      return { success: false, error: 'Failed to update company' }
    }
  })

  ipcMain.handle('company:deactivate', async (_event, id: number) => {
    try {
      deactivateCompany(id)
      return { success: true }
    } catch (error) {
      console.error('Deactivate company error:', error)
      return { success: false, error: 'Failed to deactivate company' }
    }
  })

  ipcMain.handle('company:updateLastUsed', async (_event, id: number) => {
    try {
      updateCompanyLastUsed(id)
      return { success: true }
    } catch (error) {
      console.error('Update company last used error:', error)
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
      console.error('Fetch accounts error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch accounts'
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
        console.error('Fetch transactions error:', error)
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
        console.error('Set company ledger record error:', error)
        return { success: false, error: 'Failed to set ledger record' }
      }
    }
  )

  ipcMain.handle('companyLedger:get', async (_event, companyId: number, key: string) => {
    try {
      const record = getCompanyLedgerRecord(companyId, key)
      return { success: true, record }
    } catch (error) {
      console.error('Get company ledger record error:', error)
      return { success: false, error: 'Failed to get ledger record' }
    }
  })

  ipcMain.handle('companyLedger:getAll', async (_event, companyId: number) => {
    try {
      const records = getAllCompanyLedgerRecords(companyId)
      return { success: true, records }
    } catch (error) {
      console.error('Get all company ledger records error:', error)
      return { success: false, error: 'Failed to get ledger records' }
    }
  })

  ipcMain.handle('companyLedger:delete', async (_event, companyId: number, key: string) => {
    try {
      deleteCompanyLedgerRecord(companyId, key)
      return { success: true }
    } catch (error) {
      console.error('Delete company ledger record error:', error)
      return { success: false, error: 'Failed to delete ledger record' }
    }
  })
}
