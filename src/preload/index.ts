import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // User authentication
  userLogin: (email: string) => ipcRenderer.invoke('user:login', email),
  userSignup: (name: string, email: string) => ipcRenderer.invoke('user:signup', name, email),
  userGetAll: () => ipcRenderer.invoke('user:getAll'),
  userUpdate: (id: number, name: string, email: string) =>
    ipcRenderer.invoke('user:update', id, name, email),

  // API Key management
  apiKeyCreate: (userId: number, apiKey: string, keyName?: string) =>
    ipcRenderer.invoke('apiKey:create', userId, apiKey, keyName),
  apiKeyGetActive: (userId: number) => ipcRenderer.invoke('apiKey:getActive', userId),
  apiKeyGetAll: (userId: number, activeOnly?: boolean) =>
    ipcRenderer.invoke('apiKey:getAll', userId, activeOnly),
  apiKeyUpdate: (id: number, apiKey: string, keyName?: string) =>
    ipcRenderer.invoke('apiKey:update', id, apiKey, keyName),
  apiKeyDeactivate: (id: number) => ipcRenderer.invoke('apiKey:deactivate', id),

  // Company management
  companyCreate: (userId: number, name: string, apiKey: string) =>
    ipcRenderer.invoke('company:create', userId, name, apiKey),
  companyGetById: (id: number) => ipcRenderer.invoke('company:getById', id),
  companyGetAll: (userId: number, activeOnly?: boolean) =>
    ipcRenderer.invoke('company:getAll', userId, activeOnly),
  companyUpdate: (id: number, name: string, apiKey: string) =>
    ipcRenderer.invoke('company:update', id, name, apiKey),
  companyDeactivate: (id: number) => ipcRenderer.invoke('company:deactivate', id),
  companyUpdateLastUsed: (id: number) => ipcRenderer.invoke('company:updateLastUsed', id),

  // Mercury API
  mercuryFetchTransactions: (apiKey: string, queryString?: string) =>
    ipcRenderer.invoke('mercury:fetchTransactions', apiKey, queryString),
  mercuryFetchAccounts: (apiKey: string) =>
    ipcRenderer.invoke('mercury:fetchAccounts', apiKey),

  // Company Ledger Records
  companyLedgerSet: (companyId: number, key: string, value: string) =>
    ipcRenderer.invoke('companyLedger:set', companyId, key, value),
  companyLedgerGet: (companyId: number, key: string) =>
    ipcRenderer.invoke('companyLedger:get', companyId, key),
  companyLedgerGetAll: (companyId: number) =>
    ipcRenderer.invoke('companyLedger:getAll', companyId),
  companyLedgerDelete: (companyId: number, key: string) =>
    ipcRenderer.invoke('companyLedger:delete', companyId, key),

  // Ledger Presets
  ledgerPresetCreate: (key: string, label: string, description?: string) =>
    ipcRenderer.invoke('ledgerPreset:create', key, label, description),
  ledgerPresetGetById: (id: number) => ipcRenderer.invoke('ledgerPreset:getById', id),
  ledgerPresetGetByKey: (key: string) => ipcRenderer.invoke('ledgerPreset:getByKey', key),
  ledgerPresetGetAll: () => ipcRenderer.invoke('ledgerPreset:getAll'),
  ledgerPresetUpdate: (id: number, key: string, label: string, description?: string) =>
    ipcRenderer.invoke('ledgerPreset:update', id, key, label, description),
  ledgerPresetDelete: (id: number) => ipcRenderer.invoke('ledgerPreset:delete', id),

  // Mercury Accounts
  mercuryAccountSyncFromApi: (companyId: number, apiKey: string) =>
    ipcRenderer.invoke('mercuryAccount:syncFromApi', companyId, apiKey),
  mercuryAccountGetByCompanyId: (companyId: number) =>
    ipcRenderer.invoke('mercuryAccount:getByCompanyId', companyId),
  mercuryAccountSetLedgerMapping: (mercuryAccountId: number, ledgerPresetId: number) =>
    ipcRenderer.invoke('mercuryAccount:setLedgerMapping', mercuryAccountId, ledgerPresetId),
  mercuryAccountGetLedgerMappings: (mercuryAccountId: number) =>
    ipcRenderer.invoke('mercuryAccount:getLedgerMappings', mercuryAccountId),

  // CSV Mappings
  csvMappingGetByCompanyAndType: (companyId: number, exportType: string) =>
    ipcRenderer.invoke('csvMapping:getByCompanyAndType', companyId, exportType),
  csvMappingUpsert: (companyId: number, exportType: string, fieldName: string, template: string) =>
    ipcRenderer.invoke('csvMapping:upsert', companyId, exportType, fieldName, template),
  csvMappingDelete: (id: number) => ipcRenderer.invoke('csvMapping:delete', id),

  // Window management
  windowOpenCompanyReports: (companyId: number, companyName: string) =>
    ipcRenderer.invoke('window:openCompanyReports', companyId, companyName)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
