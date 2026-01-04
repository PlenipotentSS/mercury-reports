import { ElectronAPI } from '@electron-toolkit/preload'

interface User {
  id: number
  name: string
  email: string
  created_at: string
}

interface ApiKey {
  id: number
  user_id: number
  api_key: string
  key_name: string | null
  is_active: number
  created_at: string
  updated_at: string
  last_used_at: string | null
}

interface Company {
  id: number
  user_id: number
  name: string
  api_key: string
  is_active: number
  created_at: string
  updated_at: string
  last_used_at: string | null
}

interface CompanyLedgerRecord {
  id: number
  company_id: number
  key: string
  value: string
  created_at: string
  updated_at: string
}

interface LedgerPreset {
  id: number
  key: string
  label: string
  description: string | null
  created_at: string
  updated_at: string
}

interface MercuryAccount {
  id: number
  company_id: number
  external_id: string
  name: string
  nickname: string | null
  dashboard_link: string | null
  status: string | null
  account_type: string | null
  created_at: string
  updated_at: string
}

interface AccountLedgerMapping {
  id: number
  mercury_account_id: number
  ledger_preset_id: number
  created_at: string
  updated_at: string
}

interface CsvMapping {
  id: number
  company_id: number
  export_type: string
  field_name: string
  template: string
  created_at: string
  updated_at: string
}

interface API {
  // User authentication
  userLogin: (email: string) => Promise<{ success: boolean; user?: User; error?: string }>
  userSignup: (
    name: string,
    email: string
  ) => Promise<{ success: boolean; user?: User; error?: string }>
  userGetAll: () => Promise<{ success: boolean; users?: User[]; error?: string }>
  userUpdate: (
    id: number,
    name: string,
    email: string
  ) => Promise<{ success: boolean; user?: User; error?: string }>

  // API Key management
  apiKeyCreate: (
    userId: number,
    apiKey: string,
    keyName?: string
  ) => Promise<{ success: boolean; apiKeyId?: number; error?: string }>
  apiKeyGetActive: (
    userId: number
  ) => Promise<{ success: boolean; apiKey?: ApiKey; error?: string }>
  apiKeyGetAll: (
    userId: number,
    activeOnly?: boolean
  ) => Promise<{ success: boolean; apiKeys?: ApiKey[]; error?: string }>
  apiKeyUpdate: (
    id: number,
    apiKey: string,
    keyName?: string
  ) => Promise<{ success: boolean; error?: string }>
  apiKeyDeactivate: (id: number) => Promise<{ success: boolean; error?: string }>

  // Company management
  companyCreate: (
    userId: number,
    name: string,
    apiKey: string
  ) => Promise<{ success: boolean; companyId?: number; error?: string }>
  companyGetById: (id: number) => Promise<{ success: boolean; company?: Company; error?: string }>
  companyGetAll: (
    userId: number,
    activeOnly?: boolean
  ) => Promise<{ success: boolean; companies?: Company[]; error?: string }>
  companyUpdate: (
    id: number,
    name: string,
    apiKey: string
  ) => Promise<{ success: boolean; error?: string }>
  companyDeactivate: (id: number) => Promise<{ success: boolean; error?: string }>
  companyUpdateLastUsed: (id: number) => Promise<{ success: boolean; error?: string }>

  // Mercury API
  mercuryFetchTransactions: (
    apiKey: string,
    queryString?: string
  ) => Promise<{ success: boolean; data?: any; error?: string }>
  mercuryFetchAccounts: (apiKey: string) => Promise<{ success: boolean; data?: any; error?: string }>
  mercuryFetchCreditAccounts: (apiKey: string) => Promise<{ success: boolean; data?: any; error?: string }>

  // Company Ledger Records
  companyLedgerSet: (
    companyId: number,
    key: string,
    value: string
  ) => Promise<{ success: boolean; error?: string }>
  companyLedgerGet: (
    companyId: number,
    key: string
  ) => Promise<{ success: boolean; record?: CompanyLedgerRecord; error?: string }>
  companyLedgerGetAll: (
    companyId: number
  ) => Promise<{ success: boolean; records?: CompanyLedgerRecord[]; error?: string }>
  companyLedgerDelete: (
    companyId: number,
    key: string
  ) => Promise<{ success: boolean; error?: string }>

  // Ledger Presets
  ledgerPresetCreate: (
    key: string,
    label: string,
    description?: string
  ) => Promise<{ success: boolean; id?: number; error?: string }>
  ledgerPresetGetById: (
    id: number
  ) => Promise<{ success: boolean; preset?: LedgerPreset; error?: string }>
  ledgerPresetGetByKey: (
    key: string
  ) => Promise<{ success: boolean; preset?: LedgerPreset; error?: string }>
  ledgerPresetGetAll: () => Promise<{ success: boolean; presets?: LedgerPreset[]; error?: string }>
  ledgerPresetUpdate: (
    id: number,
    key: string,
    label: string,
    description?: string
  ) => Promise<{ success: boolean; error?: string }>
  ledgerPresetDelete: (id: number) => Promise<{ success: boolean; error?: string }>

  // Mercury Accounts
  mercuryAccountSyncFromApi: (
    companyId: number,
    apiKey: string
  ) => Promise<{ success: boolean; syncedCount?: number; error?: string }>
  mercuryAccountGetByCompanyId: (
    companyId: number
  ) => Promise<{ success: boolean; accounts?: MercuryAccount[]; error?: string }>
  mercuryAccountSetLedgerMapping: (
    mercuryAccountId: number,
    ledgerPresetId: number
  ) => Promise<{ success: boolean; error?: string }>
  mercuryAccountGetLedgerMappings: (
    mercuryAccountId: number
  ) => Promise<{ success: boolean; mappings?: AccountLedgerMapping[]; error?: string }>

  // CSV Mappings
  csvMappingGetByCompanyAndType: (
    companyId: number,
    exportType: string
  ) => Promise<{ success: boolean; mappings?: CsvMapping[]; error?: string }>
  csvMappingUpsert: (
    companyId: number,
    exportType: string,
    fieldName: string,
    template: string
  ) => Promise<{ success: boolean; error?: string }>
  csvMappingDelete: (id: number) => Promise<{ success: boolean; error?: string }>

  // Window management
  windowOpenCompanyReports: (
    companyId: number,
    companyName: string
  ) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
